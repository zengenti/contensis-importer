# [![Contensis](https://github.com/contensis/cli/raw/refs/heads/main/assets/contensis-logo--tiny.svg)](https://www.contensis.com) Contensis Importer [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![NPM version](https://img.shields.io/npm/v/contensis-importer.svg?style=flat)](https://www.npmjs.com/package/contensis-importer)

Bulk load or maintain Contensis content using TypeScript or JavaScript

## What is Contensis Importer?

Contensis Importer provides a simple interface for extracting, mapping and importing content entries, models, nodes, tags, and assets between environments or from external sources into any Contensis project.

It is built to support repeatable, version-controlled content migration workflows that scale with project complexity.

## What can I use this for?

- Bulk import or update existing content
- Migrate data from external sources into Contensis
- Prepare a Contensis project with content models and other dependencies
- Sync dev/live/staging environments
- Upload supporting assets (e.g. images, files), nodes or tags alongside entries

## Quick start

Create a new Node.js + TypeScript project and run your first import in a few steps.

### 1. Initialise a new project

Create a new folder and initialise it as an npm project:

```bash
mkdir my-import-project
cd my-import-project
npm init -y
```

### 2. Install dependencies

Install the required packages:

```bash
npm install --save contensis-importer aguid
npm install --save-dev typescript cross-env
```

- `aguid` generates consistent GUIDs from input data
- `cross-env` lets you define environment variables in your npm scripts
- `typescript` enables TypeScript support in your project

### 3. Initialise TypeScript

This sets up your project to compile `.ts` files into `.js` and will add a default `tsconfig.json` file

```bash
npx tsc --init
```

### 4. Add npm scripts

In your `package.json`, add:

```json
"type": "module",
"scripts": {
  "build": "tsc",
  "start": "node index.js",
  "prestart": "npm run build",
  "import:dev": "cross-env TARGET=dev COMMIT=false node index.js"
}
```

- `build` will compile the TypeScript code into JavaScript files
- `start` will run your script from the compiled JavaScript
- `prestart` build the script each time so we always run it with the latest changes
- `import:dev` is an example expanding the reach of your importer to specify environment variables before running your script so you could run your importer with different conditions in multiple contexts

### 5. Create an import script

Create a file called `index.ts` (or anything you like) in your project root:

```ts
import { createImport } from 'contensis-importer';

const importer = createImport({
  /* connection options */
});

const run = async () => {
  const entries = await importer.GetEntries({
    zenQL: 'sys.contentTypeId = news',
  });
  for (const entry of entries) {
    console.log(`${entry.sys.contentTypeId}: ${entry.entryTitle}`);
  }
};

run();
```

### 6. Run it

Build and run the script:

```bash
npm start
```

## Usage styles

You can use either a functional or class-based approach depending on project complexity.

### Option 1: `createImport` (for simpler scripts)

```ts
import { createImport } from 'contensis-importer';

const importer = createImport({
  /* connection options */
});

const runImport = async () => {
  const entries = await importer.GetEntries({
    zenQL: 'sys.contentTypeId IN (news, author)',
  });
  const mappedEntries = contensis.MapEntries(entries, {
    /* key must match the contentTypeId of each entry to map it */
    news: article => {
      /* map a new field */
      article.channel = 'web';

      /* update an existing field */
      if (article.headline) {
        article.headline = `${article.headline} - updated`;
      }

      /* map a field that links to another entry */
      article.department = {
        sys: { id: '/* entry guid */', contentTypeId: 'department' },
      };

      /* map a field with a link to another entry that we retrieved */
      article.author = entries.find(
        e =>
          e.userId === article.sys.version?.createdBy &&
          e.sys.contentTypeId === 'author'
      );

      return article;
    },
  });
  await importer.ImportEntries({ entries: mappedEntries });
};

runImport();
```

### Option 2: Extend `ImportBase` class (structured projects)

```ts
// `NewsImport.ts`
import { ImportBase } from 'contensis-importer';

class NewsImport extends ImportBase {
  RunImport = async () => {
    try {
      const entries = await this.GetEntries({
        zenQL: 'sys.contentTypeId = news',
      });
      return [, entries];
    } catch (ex) {
      return [ex, undefined];
    }
  };
}

// `index.ts`
const newsImporter = new NewsImport({
  /* connection options */
});

const [error, result] = await newsImporter.RunImport();
```

## Configuring connections

Use the `source`, `target`, and other parameters when creating an importer instance to define connection environments.

Example connection setup is available in the [example project](https://github.com/zengenti/contensis-importer/blob/main/packages/import-test-project/src/connections.ts)

- Parameters set at creation are used as defaults
- Importer method options override these options when supplied

## Import content from external systems

**Step 1: Adapt your source data**

Source data exported as JSON can added to the importer script directly.

If this is not available, write an adapter to connect to and retrieve your source data. It is possible to convert any data type (XML, CSV, API, etc.) into JavaScript objects.

**Step 2: Map your source to Contensis entries**

Map source records to Contensis entries, source fields to the destination content type fields, ensuring valid structure and metadata:

- `sys.id` - required and must be deterministic
- `sys.contentTypeId` - identifies the content type
- `sys.language`, `sys.isPublished`, etc.

**Step 3: Run the import to produce a preview**

Push your entries into an array and call:

```ts
const [error, result] = await importer.ImportEntries({ entries });
```

Progress and summary information will be logged to the console. The `result` object contains a structured summary of the import available when the `ImportEntries` method has finished processing.

**Step 4: Commit the import**

Everything up to this point is performing safe API operations, making only `GET` calls to fetch and analyse project content. The process becomes destructive only when we set the `commit` flag.

> **Do not skip to this step until you have run the import preview** and are totally sure the console output is right for what you are trying to do

- Set environment variable `COMMIT=true` to automatically commit the changes to your `target` environment, set the variable via npm scripts
- For code you intend to run for only one time, create your importer with the second argument set to `true`
- To never commit a particular call, set the `importer.commit` attribute inline before your import method call like `importer.commit = false` , and `importer.commit = process.env.COMMIT` to reset the flag back to the environment variable.

See a full [WordPress import example](https://github.com/zengenti/contensis-importer/blob/main/packages/import-test-project/src/importer.ts)

## Why use this package?

Contensis Importer builds on the [Migratortron](https://www.npmjs.com/package/migratortron) package, providing:

- Sensible defaults for ETL operations
- Orchestrating calls to the `contensis-management-api`
- Automatic resolution of linked entries/assets from provided `sys.id`s
- Diffing with existing content to detect updates
- Preview changes before commit
- Consistent functionality shared with the [Contensis CLI](https://www.npmjs.com/package/contensis-cli)

Compared to directly using the [`contensis-management-api`](https://www.npmjs.com/package/contensis-management-api), this package gives you a simpler, repeatable import process tailored for Contensis. With better traceability and without all the boilerplate.

## Will this do everything for me?

No - this library focuses on **loading** data into Contensis using the Management API exactly as you provide it. You are responsible for:

- Providing valid Contensis entry JSON
- Mapping or transforming your source data

It cannot take an array of incorrectly mapped or invalid JSON and have it automatically "joined up" when it hits Contensis.

### Mapping hints

- Use `sys.contentTypeId` to define the entry type
- Generate deterministic GUIDs for `sys.id` - to allow the same entry to be created, updated or linked to as many times as needed
- Do not supply `sys.version` - the latest version is updated automatically
- Use `sys.language` for different translations (do not mix language variations in a single operation)
- Set `sys.isPublished` to `true` if you want the entry to be published after it is created or updated.

Create canvas fields from scraped HTML with the help of [@contensis/html-canvas](https://github.com/contensis/canvas/tree/main/packages/html-canvas#usage) package in your entry mapping

Entry fields that reference assets, entries or tags:

- Must reference existing `sys.id` values
- Or those assets are included in the same import operation with matching IDs
- Map content link fields using the same deterministic GUID generated for the `sys.id` field in the referenced entry, ensuring we generate the same GUID for the resource, and the link.

To import assets, include them in the same array as entries and set:

- `sys.uri` - to a local file path, external URL, or existing Contensis asset URI
- `sys.properties.filePath` - folder path in the CMS
- `sys.properties.filename` - desired filename in the CMS

### Deterministic GUIDs

Guarantee that input values are truly unique when generating deterministic GUIDs, a GUID will not be unique if it has been generated using the same input as another process doing the same job:

- sequential numbers such as 1, 2, 3 could be used in another resource type
- avoid using any values that could ever change, each change in between imports will result in a duplicate entry with a different `sys.id`
- create your own "composite key" that guarantees uniqueness and avoids potential clashes when generating GUIDs from different contexts (e.g. future content imports)

Build unique composite keys for deterministic GUID generation using data that never changes:

- An existing ID field
- Records containing a unique combination of data in fields
- Data with no discernable ID? Do your best, tread very carefully with future imports
- Qualify any "key" with a string to say where it came from
- Qualify any "key" with the `contentTypeId` it is destined for
- Use the same values when generating a GUID to map any links to this content in other resources

Refer to Contensis documentation for [entry JSON examples](https://www.contensis.com/help-and-docs/apis/management-http/content/entries/update-an-entry)

## Limitations

### `sys.id` is required

Every entry (and content link) must include a valid and unique `sys.id`. This is necessary to ensure imports are repeatable and do not create duplicate entries.

When mapping your own data, you must generate a deterministic GUID - one that consistently maps the same input data to the same ID.

### Large imports may take time

Depending on the volume and complexity of your data, importing many entries can take several minutes or hours.

## Larger projects

- Never commit code to a source repository with the `commit` flag pre-set to `true` - ensure the script will default to run a preview
- Use separate importer classes per content type / subject area
- Maintain environment connections in a shared module
- Read configuration from environment variables
- Add npm scripts to cover multiple use cases over modifying the script each time you run it, using flags like `COMMIT=true` to control behavior.
- Separate your source->content type mappings as they become more cumbersome
- Retrieve and "cache" your source-data with another script so we don't need to fetch and prepare a large dataset each time we re-run the importer
- Trace the network calls made with a web proxy debugger (such as Fiddler) by setting environment variable `http_proxy=http://127.0.0.1:8888`

## API reference

Each method is available on the importer instance returned by `createImport` or via `this` in classes that extend `ImportBase`.

### GetEntries

Retrieve entries from a `source` environment and `project` with a supplied `query` or `zenQL` statement.

Returns an array of entries retrieved from the Management API, including any other entries or asset entries that are linked to any entry returned.

Set `withDependents: false` option to get just the entries we have queried, or `stopLevel: <number>` to fetch all entries, but stopping at the given link depth.

```ts
const entries = importer.GetEntries({
  zenQL: 'sys.contentTypeId = news',
  withDependents: false,
});
```

### MapEntries

Apply transformation functions to an array of entries by content type:

The example takes an array of `entries` and for every `news` entry, the `headline` field will be appended with ` - updated`

```ts
const mappedEntries = importer.MapEntries(entries, {
  // applied to each entry where `sys.contentTypeId` is `news`
  news: (entry: NewsEntry) => {
    // append to the existing `headline` field
    entry.headline: entry.headline + ' - updated';
    return entry;
  }
});
```

### ImportEntries

Import an array of `entries` to the `target` environment in all supplied `projects`

```ts
const [error, result] = await importer.ImportEntries({
  entries: mappedEntries,
});
```

### GetContentModels

Retrieve content types and all their dependencies:

```ts
const models = await importer.GetContentModels({ models: ['news'] });
```

### ImportContentModels

Import content models, comprising of content types and any dependent components, tag groups or default entries/nodes:

```ts
const [error, result] = await importer.ImportContentModels({
  contentTypes: [
    /* content types or forms, plus content types assigned to entry picker fields */
  ],
  components: [
    /* components attached to resources */
  ],
  entries: [
    /* entries set as a default field value */
  ],
  nodes: [
    /* nodes set as a default parent node or a form redirect */
  ],
  tags: [
    /* tags set as a default field value */
  ],
  tagGroups: [
    /* tag groups assigned to tag picker fields */
  ],
});
```

### ImportNodes

Import site view nodes. Each node requires a `displayName` and either a `path` or `parentId` and `slug`.

- `id` is not required to create or update nodes, however supply them if you have them or wish to set them yourself
- if `entryId` is set, this must resolve an entry that exists

```ts
const [error, result] = await importer.ImportNodes({ nodes });
```

### ImportTags

Import tags and any parent tag groups so they can be referenced in entries:

```ts
const [error, result] = await importer.ImportTags({ tags, tagGroups });
```

### ImportTagGroups

Import tag groups only:

```ts
const [error, result] = await importer.ImportTagGroups({ tagGroups });
```

## Useful links

- [Example project](https://github.com/zengenti/contensis-importer/tree/main/packages/import-test-project)
- [Contensis entry JSON examples](https://www.contensis.com/help-and-docs/apis/management-http/content/entries/update-an-entry)
- [aguid (deterministic GUIDs) on npm](https://github.com/dwyl/aguid)
- [Migratortron on npm](https://www.npmjs.com/package/migratortron)
- [Contensis CLI](https://github.com/contensis/cli/blob/main/packages/contensis-cli/README.md#contensis-shell)
- [Contensis Management API docs](https://www.contensis.com/help-and-docs/apis/management-http)
