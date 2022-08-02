# Contensis importer

Consolidating data into Contensis with JavaScript or TypeScript

If you are using this package you may want the [Contensis importer package README](packages/contensis-importer/README.md)

# Contensis importer development

After cloning this project:

1.  `yarn run bootstrap`

The "packages" you have cloned into the `./packages` folder should be running in a shared workspace and all dependencies are installed.

References to packages from other package that are in the `./packages` folder will be 'symlinked' to point at the local package folder rather than install the package from npm.

- `yarn run build` - build the packages and the sample importer project

This is all using [lerna](https://lerna.js.org/) scripts underneath to allow us to synchronise script runs with the packages in our workspace

To run the sample importer project you can `cd ./packages/import-test-project/` then run the import alone, or launch this application with the built-in VS Code debugger to allow debugging of all workspace packages.
