[![npm version](https://badge.fury.io/js/@lesjoursfr%2Fbootstrap-context-menu.svg)](https://badge.fury.io/js/@lesjoursfr%2Fbootstrap-context-menu)
[![QC Checks](https://github.com/lesjoursfr/bootstrap-context-menu/actions/workflows/quality-control.yml/badge.svg)](https://github.com/lesjoursfr/bootstrap-context-menu/actions/workflows/quality-control.yml)

# @lesjoursfr/bootstrap-context-menu

Bootstrap 5 context menu library.

## Requirements

To work this library needs :

- [@popperjs/core](https://www.npmjs.com/package/@popperjs/core) **2.x**
- [bootstrap](https://www.npmjs.com/package/bootstrap) **5.x**

## How to use

```javascript
import { BootstrapContextMenu } from "@lesjoursfr/bootstrap-context-menu";

/* Initialize the BootstrapContextMenu */
new BootstrapContextMenu({
	selector: "#bootstrap-context-menu",
	items: {
		// Define your menu items here
	},
	callback: (key, event) => {
		// Handle menu item click
	},
});
```

## License

The MIT License (MIT).
Please see the [License File](https://github.com/lesjoursfr/bootstrap-context-menu/blob/master/license) for more information.
