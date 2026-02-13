import { getAttribute, getData, off, on, setAttribute, setData } from "@lesjoursfr/browser-tools";
import { createPopper } from "@popperjs/core";

let bsContextMenuIdCounter = 0;

const root = (typeof self !== "undefined" ? self : this) as Window; // window

type PopperInstance = ReturnType<typeof createPopper>;

export type BootstrapContextMenuItem = {
  name: string;
  icon?: string;
  items?: BootstrapContextMenuItems;
};

export type BootstrapContextMenuItems = { [key: string]: BootstrapContextMenuItem };

export type BootstrapContextMenuOptions = {
  selector: string;
  items?: BootstrapContextMenuItems;
  builder?: (this: BootstrapContextMenu, event: PointerEvent) => BootstrapContextMenuItems;
  callback: (this: BootstrapContextMenu, key: string, opener: HTMLElement) => void;
  events?: {
    show?: (this: BootstrapContextMenu) => void;
    hide?: (this: BootstrapContextMenu) => void;
  };
};

export class BootstrapContextMenu {
  public readonly selector: string;
  private readonly items?: BootstrapContextMenuItems;
  private readonly builder?: (this: BootstrapContextMenu, event: PointerEvent) => BootstrapContextMenuItems;
  private readonly callback: (this: BootstrapContextMenu, key: string, opener: HTMLElement) => void;
  private readonly onShow?: (this: BootstrapContextMenu) => void;
  private readonly onHide?: (this: BootstrapContextMenu) => void;
  private readonly menuId: string;

  private menuElement?: HTMLElement & { _closeHandler?: EventListener };
  private popperInstance?: PopperInstance;

  constructor(options: BootstrapContextMenuOptions) {
    if (typeof options.selector !== "string") {
      throw new Error("BootstrapContextMenu requires a 'selector' option.");
    }
    if (typeof options.callback !== "function") {
      throw new Error("BootstrapContextMenu requires a 'callback' option.");
    }
    if (typeof options.items !== "object" && typeof options.builder !== "function") {
      throw new Error("BootstrapContextMenu requires either 'items' or 'builder' option.");
    }

    this.selector = options.selector;
    this.items = options.items;
    this.builder = options.builder?.bind(this);
    this.callback = options.callback.bind(this);
    this.onShow = options.events?.show?.bind(this);
    this.onHide = options.events?.hide?.bind(this);
    this.menuId = `id-${++bsContextMenuIdCounter}`;

    on(root, `contextmenu.bs-ctx-menu.${this.menuId}`, (event: Event) => {
      // Check if the target matches the selector or is a child of an element that matches the selector
      if (null === (event.target as HTMLElement).closest(this.selector)) {
        return;
      }

      // Block the default context menu and stop the event from propagating further
      event.preventDefault();
      event.stopPropagation();

      // Show the custom context menu
      this.show(event as PointerEvent);
    });
  }

  public show(event: PointerEvent): void {
    // Get the items
    const items: BootstrapContextMenuItems | undefined = this.builder ? this.builder(event) : this.items;
    if (!items) {
      return;
    }

    // Save the opener element reference for use in the callback
    const opener = event.target as HTMLElement;

    // Create the menu element
    this.menuElement = this.renderMenuItems(items);
    document.body.appendChild(this.menuElement);

    // Create a virtual reference element at the pointer position
    const virtualElement = {
      getBoundingClientRect: () => ({
        top: event.clientY,
        left: event.clientX,
        bottom: event.clientY,
        right: event.clientX,
        width: 0,
        height: 0,
        x: event.clientX,
        y: event.clientY,
      }),
    };

    // Initialize Popper.js for positioning
    this.popperInstance = createPopper(virtualElement as unknown as Element, this.menuElement, {
      placement: "bottom-start",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 4],
          },
        },
        {
          name: "preventOverflow",
          options: {
            padding: 8,
          },
        },
      ],
    });

    // Add a click listener to the menu
    on(this.menuElement, `click.bs-ctx-menu.${this.menuId}`, (event: Event) => {
      event.stopPropagation();
      event.preventDefault();

      const menuItem = (event.target as HTMLElement).closest<HTMLElement>("[bs-ctx-menu-key]");
      if (!menuItem) {
        return;
      }

      const key = getAttribute(menuItem, "bs-ctx-menu-key");
      if (null === key) {
        return;
      }

      this.callback(key, opener);
      this.hide(event as PointerEvent);
    });

    // Add click outside listener to close menu
    on(root, `mousedown.bs-ctx-menu.${this.menuId}`, (event: Event) => {
      if (true === this.menuElement!.contains(event.target as HTMLElement)) {
        return;
      }

      this.hide(event as PointerEvent);
    });

    // Call the event callback if it exists
    if (this.onShow) {
      this.onShow();
    }
  }

  public hide(_event: PointerEvent): void {
    // Destroy the Popper instance
    this.popperInstance!.destroy();
    this.popperInstance = undefined;

    // Remove mouse listeners for submenu items
    const submenuItems = this.menuElement!.querySelectorAll<HTMLElement>(".bs-ctx-has-submenu");
    off(submenuItems, `mouseenter.bs-ctx-menu.${this.menuId}`);
    off(submenuItems, `mouseleave.bs-ctx-menu.${this.menuId}`);

    // Remove the click listener from the menu element
    off(this.menuElement!, `click.bs-ctx-menu.${this.menuId}`);

    // Remove the menu element reference
    this.menuElement!.remove();
    this.menuElement = undefined;

    // Remove the global mousedown listener for this menu
    off(root, `mousedown.bs-ctx-menu.${this.menuId}`);

    // Call the event callback if it exists
    if (this.onHide) {
      this.onHide();
    }
  }

  private renderMenuItems(items: BootstrapContextMenuItems): HTMLElement {
    // Create the menu container
    const menu = document.createElement("ul");
    menu.className = "bs-ctx-menu dropdown-menu show";

    // Iterate over the items and create menu entries
    Object.entries(items).forEach(([key, item]) => {
      const li = document.createElement("li");
      setAttribute(li, "bs-ctx-menu-key", key);
      const a = document.createElement("a");
      a.href = "#";
      a.className = "dropdown-item";

      // Add icon if provided
      if (item.icon) {
        const icon = document.createElement("i");
        icon.className = item.icon;
        icon.style.marginRight = "0.5rem";
        a.appendChild(icon);
      }

      const text = document.createElement("span");
      text.textContent = item.name;
      a.appendChild(text);

      // Check if there are nested items (submenu)
      if (item.items && Object.keys(item.items).length > 0) {
        // Show a caret for submenu items
        li.classList.add("bs-ctx-has-submenu");

        // Bind hover events to show/hide the submenu
        on(li, `mouseenter.bs-ctx-menu.${this.menuId}`, () => {
          this.showSubMenu(li, item.items!);
        });
        on(li, `mouseleave.bs-ctx-menu.${this.menuId}`, () => {
          this.hideSubMenu(li);
        });
      }

      // Append the menu item to the menu
      li.appendChild(a);
      menu.appendChild(li);
    });

    return menu;
  }

  private showSubMenu(parent: HTMLElement, items: BootstrapContextMenuItems): void {
    const submenu = document.createElement("ul");
    submenu.className = "bs-ctx-submenu dropdown-menu show";

    // Create submenu items
    Object.entries(items).forEach(([key, item]) => {
      const li = document.createElement("li");
      setAttribute(li, "bs-ctx-menu-key", key);
      const a = document.createElement("a");
      a.href = "#";
      a.className = "dropdown-item";

      // Add icon if provided
      if (item.icon) {
        const icon = document.createElement("i");
        icon.className = item.icon;
        icon.style.marginRight = "0.5rem";
        a.appendChild(icon);
      }

      const text = document.createElement("span");
      text.textContent = item.name;
      a.appendChild(text);

      li.appendChild(a);
      submenu.appendChild(li);
    });

    // Create a Popper instance for the submenu
    const subMenuPopperInstance = createPopper(parent, submenu, {
      placement: "right-start",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 0],
          },
        },
        {
          name: "preventOverflow",
          options: {
            padding: 8,
          },
        },
      ],
    });
    setData(submenu, "popperInstance", subMenuPopperInstance);

    parent.appendChild(submenu);
  }

  private hideSubMenu(parent: HTMLElement): void {
    const submenu = parent.querySelector<HTMLElement>(".bs-ctx-submenu") as HTMLElement;

    // Destroy the Popper instance for the submenu
    const subMenuPopperInstance = getData(submenu, "popperInstance") as PopperInstance | undefined;
    subMenuPopperInstance?.destroy();

    // Remove the submenu element
    submenu.remove();
  }
}
