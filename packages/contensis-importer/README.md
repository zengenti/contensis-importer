# Contensis importer [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![NPM version](https://img.shields.io/npm/v/contensis-importer.svg?style=flat)](https://www.npmjs.com/package/contensis-importer)

Consolidating or updating data into Contensis with JavaScript or TypeScript

## What is it?

Contensis importer provides a series of interfaces to easily perform bulk entry extract or loading to and/or from any Contensis instance

### Get started

Create a new npm project in a folder by running `npm init` in a terminal, or install the package into an existing npm project.

Install the `contensis-importer` package from npm.js

```sh
npm install --save contensis-importer aguid
```

Other recommended packages:

- `aguid` installed above allows us to generate deterministic guids (guids that are always generated the same way given the same input) to map to our `sys.id` attribute in our entries if we are mapping external data that does not have its own guid ([example](https://github.com/zengenti/contensis-importer/blob/main/packages/import-test-project/src/importers/wordpress/mapper.ts#L27)).

Recommended development packages:

```sh
npm install --save-dev cross-env typescript
```

- `cross-env` enables us to define environment variables in our npm scripts

  example npm script: `"import:dev": "cross-env TARGET=dev COMMIT=false node ."` will target our connection we've aliased as `dev` and will not commit the result of the import when this script is run in our project

- `typescript` allows us to use TypeScript in our project

> **TypeScript starters**
>
> After installing TypeScript to a new project also initialise the TypeScript project
>
> `npx tsc --init`

### ImportBase or createImport

Create a new file in your project called `index.ts`

```typescript
import { createImport } from 'contensis-importer';

const contensis = createImport({ ...options });

const importer = async () => {
  const entries = await contensis.GetEntries({
    zenQL: 'sys.contentTypeId = news',
  });
};

// Inline function to run the importer
(async () => await importer())();
```

or

```typescript
import { ImportBase } from 'contensis-importer';

class NewsImport extends ImportBase {
  RunImport = async (): Promise<[Error | undefined, any]> => {
    try {
      const entries = await this.GetEntries({
        zenQL: 'sys.contentTypeId = news',
      });
      return [, entries];
    } catch (ex: any) {
      return [ex, undefined];
    }
  };
}

// Instantiate our NewsImport class somewhere in code (with any other Import classes)
const newsImporter = new NewsImport({ ...options });
// Execute the RunImport method
const [error, result] = await newsImporter.RunImport();
```

Either approach works the same, it can be a preferred coding style or it may be better to handle more complex jobs with multiple separately defined import classes.

> **TypeScript starters**
>
> Test your script compiles by running `npx tsc` and launch the compiled `index.js` script by running `node .`

#### Connection details

If you are already familiar with the Migratortron and how entry load operations work this is almost exactly the same.

The best way to get familiar is to create an importer using one of the methods above and examine the availalble options to set `source`, `target` and other import parameters. A complete example of defining connections is in the [example project](https://github.com/zengenti/contensis-importer/blob/main/packages/import-test-project/src/connections.ts)

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

The example will take an array of `entries` and for every `news` entry, the `headline` field will be appended with ` - updated`

```javascript
const newEntries = importer.MapEntries(entries, {
  news: e => {
    e.headline = `${e.headline} - updated`;
    return e;
  },
});
```

Adding additional type arguments in TypeScript projects will allow us to use any types we have defined to map each `news` entry with a `NewsEntry` type and will cast our `newEntries` variable as an array of the given `ImportEntry` type

```typescript
const newEntries = importer.MapEntries<ImportEntry>(entries, {
  news: (e: NewsEntry) => {
    e.headline = `${e.headline} - updated`;
    return e;
  },
});
```

Add more keys and discrete content type mappers for the entry types you are handling

### ImportEntries

Import any entries supplied in `entries` array to the `target` environment in all `projects` supplied

### ImportNodes

Import any nodes supplied in `nodes` array to the `target` environment in all `projects` supplied.

- You do not need to supply any ids to create or update nodes (except `entryId`)
- You must supply all "intermediate" nodes before child nodes if they do not already exist in the target project
  - e.g. for `/my-test/node` you will need to provide a node for `/my-test` as well

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

I need a simple job doing, the data we are loading is not particularly complicated and only involves one content type. For example updating existing content in one field with new data.

Answer: use the `const importer = createImport(...)` function, giving you a fully loaded importer back that can `importer.GetEntries(...)` and `importer.ImportEntries(...)` - keep your script simple and as short as possible so it remains manageable.

### Importing content from other systems / data sources

#### JSON Adapter

Ensure your content is available in JSON format - so it can be read by JavaScript. You can write a "JSON Adapter" to load in data from any system that has any kind of interface that can be consumed by JavaScript (e.g. via [npm packages](https://www.npmjs.com/) or HTTP/REST/SOAP/FTP or from various flat file formats such as CSV or XML).

The simplest possible approach would be to find a "Export to JSON" or "Save as JSON" in your source system and you can import that JSON extract directly into JavaScript to read and use the data from it.

#### Mapping source data to Contensis entries

When your data is available you will need to map this data so it represents itself to be the type of Contensis entry we are looking to create. This includes painstakingly recreating all data fields in the right format, and supplying certain `sys` fields such as `sys.id` and `sys.contentTypeId` to create entries and to link to other content.

These mapped "entries" can be pushed to the `importer.entries` array.

#### Finally

Load all supplied entries into Contensis by calling the `importer.ImportEntries` function.

The Import functions will only provide a preview of the import until a `COMMIT` flag or variable is set.

[Example WordPress import script](https://github.com/zengenti/contensis-importer/blob/main/packages/import-test-project/src/importer.ts)

### Complex migration project

I've got a big job ahead, the data is coming from all sorts of places and I need to go through multiple complex mapping excercises and create multiple importers to handle each individual content type entries we want to import.

Answer: Create individual importer scripts or classes to handle each complex content type mapping and loading.

When using a class the connected importer methods (get, map and import entries) are available under the `this` object

`class NewsImport extends ImportBase { ... }`

Maintain a `connections.js` file or preferably use TypeScript and create connection objects using the `CmsConfiguration` type for each Contensis environment you want to connect an importer to that you can get entries from or import entries to, this should include `dev` environments where available - don't include or duplicate connection details in any importer. Create an exported alias for each connection called `live` and `dev` so you can easily switch between the two if it will help.

Use a single entrypoint script to target or run each of your importers individually, and read in key variables from `process.env` or cli args (as per your importer requirements / setup)

You can set your importer to commit (when fully debugged) with `process.env` variable `COMMIT=true`

You can trace all network calls with Fiddler by setting `process.env` variable `http_proxy=http://127.0.0.1:8888` when starting your importer script.
