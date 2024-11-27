# sigma-lineage-plugin
Custom Plugin for Sigma Computing BI tool that displays lineage of nodes given parent and children tabular data.

To use in development, clone this repository and change directory into it, install the node dependencies:

```
npm install
```

Then start the node server:

```
npm start
```

To see the visual in Sigma we need to add the plugin via settings:

Then we give the plugin a name and point the production URL to:
```
http://localhost:3000
```

In edit mode of a workbook, we can add the visual to the workbook via Add Element > Plugin:
