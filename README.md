# Contensis importer development

After cloning this project:

1.  `yarn run bootstrap`

The "packages" you have cloned into the `./packages` folder should be running in a shared workspace and all dependencies are installed.

References to packages from other package that are in the `./packages` folder will be 'symlinked' to point at the local package folder rather than install the package from npm.

- `yarn run build` - build the packages and the sample importer project

This is all using [lerna](https://lerna.js.org/) scripts underneath to allow us to synchronise script runs with the packages in our workspace

To run the sample importer project you can `cd ./packages/import-test-project/` then run the import alone, or launch this application with the built-in VS Code debugger to allow debugging of all workspace packages.

# Contensis importer

Consolidating data into Contensis with JavaScript or TypeScript

## What is it?

Contensis importer provides a series of interfaces to easily perform bulk entry extract or loading from or to any Contensis instance

### ImportBase or createImporter

```typescript
const importer = createImporter(...)
```

or

```typescript
class NewsImport extends ImportBase { ... }
```

Either approach works the same, it can be a preferred coding style or it may be better to handle more complex jobs with an import class.

#### Connection details

If you are already familiar with the Migratortron and how entry load operations work this is almost exactly the same.

The best way to get familiar is to create an importer using one of the methods above and examine the availalble options to set `source`, `target` and other import parameters.

Any parameters you set when creating the importer are used as defaults when calling any importer methods, however you can also override these when calling any importer method and set different parameters for one or any of the importer methods you call. e.g. always `GetEntries` from live CMS and load into the default importer environment - could be dev or live, or just a different Contensis project

## Importer methods

### GetEntries

Get any entries according to a supplied `query` or `zenQL` statement from the `source` environment and `project`.

You will be returned an array of entries retrieved from the Management API, also any other entries or asset entries that are linked to or a dependent of any entry returned, or any other dependents of a dependent entry that is found.

Set `withDependents: false` option to get just the entries we have queried

```typescript
type GetEntries = ({
  source?,
  project?,
  query?,
  zenQL?,
  callback?,
  withDependents?,
}: GetEntriesOptions) => Promise<Entry[]>;
```

### MapEntries

Taking an array of entries (and all dependency entries) of any given content type and a keyed mapping object that will apply a discrete mapping function to an entry matching a mapping object key to the entry `sys.contentTypeId` field.

```typescript
TODO: provide example
```

### ImportEntries

Import any entries supplied in `entries` array to the `target` environment in all `projects` supplied

## What is doing the heavy lifting here?

The core of the extract and loading interfaces use existing Migratortron operations, so all of the useful Migratortron functionality is available with sensible defaults set when using it in the context of a custom bulk entry ETL (extract, transform, load) operation such as any typical entry data import.

The Migratortron library uses an entry loading implementation that is already making the best use of orchestrating the required calls to `contensis-management-api`, offering pre-commit functionality - such as fetching entries with all dependent entries, diffing entries for changes and migration preview - all that can be used here to provide the best experience loading entries into Contensis in a simple, repeatable boilerplate-free implementation

## What can I use it for

Any entry ETL (extract, transform, load) operation such as any typical entry data import. We can also migrate any content assets (involving downloading and re-uploading raw files) at the same time in the same entries array, provided the dependent asset entries are returned or manually generated / transformed, then included in the ImportEntries request.

## What are the limitations?

### We need your sys.id

Loading entries with this approach requires all entries have a `sys.id` attached to them. This is fine if you are changing entries that already exist, but if you are generating new entry data from some other source you will need to generate a value for every `sys.id` field in every entry you create. This is so we can create and update entries in a destination/target Contensis project in a repeatable way, and not create a new set of duplicate data every time the import is run. We will always create deterministic guids - i.e. a function that generates the same guid each time it is presented the same unique piece of data.

### It could take a while to run

If you're looking to load hundreds or even thousands of entries in one gulp then a committed ImportEntries operation could take minutes, even hours to run to completion.

## Will this do everything for me?

Not everything. This will load entries with the Management API exactly as you present them. The JSON data you are passing to load as entries must fully conform to a valid entry format.

You must be fully comfortable with creating or mapping potentially complex objects in JavaScript and be prepared to look at lots of raw data inside a debugging session before setting a commit flag on any import you do.

Entry or asset links in your entry data must reference guids that already exist, or be provided as entries (with the same `sys.id` guid) in the same array to be loaded at the same time.

It can't take an array of random data and expect it to be "joined up" for you when it hits Contensis.

### Deterministic GUIDs

It is crucial that you understand the guid problem - the way Contensis expects asset or entry links to be presented in the Management API and you are implementing a methodology in your entry generation/mapping code to ensure guids can be referenced or generated in a predictable and repeatable way. We often depend on "deterministic guids" methodology here so we can make consistent repeatable guids when applied in different scopes that allow us to create pre-determined entry links (and those linked entries), so the data we provide can be loaded into Contensis fully "joined up", i.e. with all associated asset and/or entry links in place.

## How to use it

### Simple migration script

I need a simple job doing, the data we are loading is not particularly complicated and only involves one content type.

Answer: use the `const importer = createImporter(...)` function, giving you a fully loaded importer back that can `importer.GetEntries(...)` and `importer.ImportEntries(...)` - keep your script simple and as short as possible so it remains manageable.

### Complex migration project

I've got a big job ahead, the data is coming from all sorts of places and I need to go through multiple complex mapping excercises and create multiple importers to handle each individual content type entries we want to import.

Answer: Create individual importer scripts or classes to handle each complex content type mapping and loading.

When using a class the connected importer methods (get, map and import entries) are available under the `this` object

`class NewsImport extends ImportBase { ... }`

Maintain a `connections.js` file or preferably use TypeScript and create connection objects using the `CmsConfiguration` type for each Contensis environment you want to connect an importer to that you can get entries from or import entries to, this should include `dev` environments where available - don't include or duplicate connection details in any importer. Create an exported alias for each connection called `live` and `dev` so you can easily switch between the two if it will help.

Use a single entrypoint script to target or run each of your importers individually, and read in key variables from `process.env` or cli args (as per your importer requirements / setup)

You can set your importer to commit (when fully debugged) with `process.env` variable `COMMIT=true`

You can trace all network calls with Fiddler by setting `process.env` variable `http_proxy=http://127.0.0.1:8888` when starting your importer script.
