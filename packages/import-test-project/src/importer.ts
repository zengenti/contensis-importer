import { createImport, TargetCms } from 'contensis-importer';
import { dev, live } from './connections';
import WordPressJsonAdapter from './adapters/WordPressJsonAdapter';
import {
  mapWpMediaToEntry,
  mapWpPostToEntry,
} from './importers/wordpress/mapper';

// Set the target CMS connection and project for the data import
const target = dev as TargetCms;
target.targetProjects = ['wordPressSite'];

// Create a targeted contensis-importer client
const contensis = createImport({
  target,
  concurrency: 3, // load entries in parallel
  transformGuids: true, // for demo purposes
});

const importer = async () => {
  // Write a JSON adapter to get the source data from any external system or API
  // so we can use the raw JSON data in our Contensis import.
  const wp = await new WordPressJsonAdapter('http://roarnews.co.uk/').get();
  // Alternatively a simple "Save as JSON" file export/dump could be imported directly
  // into JavaScript and can be used as a data source for a Contensis import.

  // Transform the raw JSON into our destination Contensis entry format
  // including any assets (such as images) attached to the entry
  for (const post of wp.posts) {
    if (post.media) {
      const assetEntry = mapWpMediaToEntry(post.media);
      contensis.entries.push(assetEntry);
    }
    const blogEntry = mapWpPostToEntry(post);
    contensis.entries.push(blogEntry);
  }

  // Finally, trigger the import to load our mapped data into Contensis.
  // We can safely preview imports until we set a COMMIT environment variable.
  const [error, result] = await contensis.ImportEntries();
  // ImportEntries will create only the assets/entries that do not exist and
  // update any that have changed since the import was last run.

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.info(JSON.stringify(result, null, 2));
  process.exit(0);
};

void importer();
