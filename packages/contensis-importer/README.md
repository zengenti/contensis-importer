# Contensis importer [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![NPM version](https://img.shields.io/npm/v/contensis-importer.svg?style=flat)](https://www.npmjs.com/package/contensis-importer)

Bulk load or maintain Contensis content with JavaScript or TypeScript

## What is it?

Contensis importer provides a series of interfaces to easily perform bulk entry extract or migration to and/or from any Contensis instance

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

The easiest way to familiarise yourself is to get up and running straight away. Create an importer using one of the methods above and examine the availalble options to set `source`, `target` and other import parameters. A complete example of defining connections is in the [example project](https://github.com/zengenti/contensis-importer/blob/main/packages/import-test-project/src/connections.ts)

Any parameters you set when creating the importer are used as defaults when calling any importer methods, however you can also supply options that override these when calling any importer method and set different parameters for the importer methods you use.

Supported scenarios:

- get entries from a live CMS to load into another environment
- load entries into a dev or live environment, or another Contensis project

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

### GetContentModels

Get a list of content types and any dependent components, tag groups, and any default entries or nodes

Provide `contentTypeId`s in the `models[]` option to return just those content types, and their dependent resources

### ImportContentModels

Import any Content Types, Forms, Components or Tag Groups, along with any default entries or site view nodes.

### ImportNodes

Import any site view nodes supplied in `nodes` array to the `target` environment in all `projects` supplied.

- You do not need to supply any ids to create or update nodes (except `entryId`)
- You must supply all "intermediate" nodes before child nodes if they do not already exist in the target project
  - e.g. for `/my-test/node` you will need to provide a node for `/my-test` as well

### ImportTags

Import any Tags (and any provided parent Tag Groups) into a target environment

### ImportTagGroups

Import any Tag Groups you require in your target environment

## Under the Hood

This library builds on the [Migratortron](https://www.npmjs.com/package/migratortron) package, using its extract/load interfaces with sensible defaults suitable for most content-based ETL (Extract, Transform, Load) operations.

Migratortron manages key tasks like:

- Orchestrating calls to the `contensis-management-api`
- Automatically resolving linked assets or entries from provided `sys.id`s
- Diffing with existing content to detect updates
- Previewing changes before commit

This allows for a simple, repeatable import process tailored for Contensis, without boilerplate code.

---

## What Can I Use This For?

This package is designed to:

- Bulk import or update existing content
- Migrate data from external sources into Contensis
- Prepare or sync a Contensis project with content models and other dependencies
- Upload assets (e.g. images, files), nodes or tags alongside entries

### Importing Assets

Assets can be included in the same import array as entries. To load asset files, set the `sys.uri` field on the asset to one of the following:

- A link to an existing Contensis asset
- An external HTTP or HTTPS URI
- A local file-system path (relative or absolute)

The destination folder and filename in Contensis are determined by:

- `sys.properties.filePath` – the target folder path in the CMS
- `sys.properties.filename` – the filename for the asset

---

## Limitations

### 1. `sys.id` is required

Every entry must include a valid and unique `sys.id`. This is necessary to ensure imports are repeatable and do not create duplicate entries.

When mapping your own data, you must generate a deterministic GUID - one that consistently maps the same input data to the same ID.

### 2. Large imports may take time

Importing hundreds or thousands of entries may take several minutes or more to complete. Performance will depend on the size and complexity of your data.

---

## Will this do everything for me?

No - this library focuses on **loading** data into Contensis with the Management API exactly as you present it. You are responsible for:

- Providing fully valid Contensis entry JSON
- Mapping or transforming your source content

### Mapping hints

- An entry's content type is identified by the value mapped into `sys.contentTypeId`
- The same entry can be created or updated as many times as needed with a deterministic guid mapped to the `sys.id`
- Do not map any `sys.version` as we will always update the latest version so it is not needed here and will be ignored
- `sys.language` defines the language variation of the entry (do not mix translated variants of the same entry in the same operation)
- Set `sys.isPublished` to be `true` if you require an entry to be published after it is created or updated.

Entry fields that link to other assets, entries or tags:

- must reference `sys.id` guids that already exist
- or be provided for loading at the same time (with a matching `sys.id` guid)

It cannot take an array of incorrectly mapped or invalid JSON and have it automatically "joined up" when it hits Contensis.

Refer to Contensis documentation for examples containing [typical entry JSON](https://www.contensis.com/help-and-docs/apis/management-http/content/entries/update-an-entry)

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
