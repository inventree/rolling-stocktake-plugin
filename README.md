[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PyPI](https://img.shields.io/pypi/v/inventree-rolling-stocktake)](https://pypi.org/project/inventree-rolling-stocktake/)
![PEP](https://github.com/inventree/rolling-stocktake-plugin/actions/workflows/pep.yaml/badge.svg)

# Rolling Stocktake Plugin
 
This is as plugin for [InvenTree](https://inventree.org) which provides integration of rolling stocktake for InvenTree.

## Description

Rolling stocktake is a method of inventory management where a small subset of inventory is counted on a regular basis, rather than counting the entire inventory at once. This plugin provides tools to facilitate rolling stocktake operations within InvenTree.

### Features

The plugin provides the following features:

- A backend API endpoint to retrieve items which are due for stocktake
- A frontend interface to view and manage rolling stocktake operations

### Dashboard Widget

Users are presented with a custom widget on their dashboard, which automatically fetches a single stock item which is due for stocktake:

![Dashboard Widget](docs/dashboard.png)

This widget allows users to quickly and easily perform stocktake operations on individual items. Once stocktake has been performed on a given item, the next item which is due for stocktake is automatically fetched.

## Installation

Install the plugin using the methods described below.

*Note: After the plugin is installed, it must be activated via the InvenTree plugin interface.*

### Via User Interface

Installation via the InvenTree plugin manager is the recommended approach:

The simplest way to install this plugin is from the InvenTree plugin interface. Enter the plugin name (`inventree-rolling-stocktake`) and click the `Install` button:

![Install Plugin](docs/install.png)

### Via Pip

To install manually via the command line, run the following command:

```bash
pip install rolling-stocktake
```

*Note: You must be operating within the InvenTree virtual environment!*

## Configuration

The plugin can be configured via the InvenTree plugin interface. The following settings are available:

| Setting | Description |
| --- | --- |
| Ignore External Locations | Ignore stock items which are located in external locations |
| Daily Limit | Maximum number of stock items to process per day (per user). |
| Allowed Group | Specify a group which is allowed to perform rolling stocktake operations. Leave blank to allow all users to perform stocktake operations. |

![Plugin Settings](docs/settings.png)
