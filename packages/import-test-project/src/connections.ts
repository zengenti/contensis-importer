import { CmsConfiguration } from 'contensis-importer';

// Set contensis credentials, set the object key to exactly match
// the CMS alias so it is handy to target the right connection in scripts
export const CONTENSIS: { [alias: string]: CmsConfiguration } = {
  mycontensis: {
    url: 'https://cms-mycontensis.cloud.contensis.com/',
    clientId: 'd509c116-49f0-4f90-b25a-7ca8e4a33fd5',
    sharedSecret:
      '44c2124e9c4e4ecd9a212d38b151f510-45ffd822caae432e8ebd20c4229352f8-067849c8ef3d45bc861bfef9292f7af6',
    assetHostname: 'https://preview-trial-003.cloud.contensis.com/',
  },
  'mycontensis-dev': {
    url: 'https://cms-mycontensis-dev.cloud.contensis.com/',
    clientId: '5bea0a71-cd21-41a9-84a3-2f64a2c4394a',
    sharedSecret:
      '22c7808a109749c8b37723a8572e5323-ea79651f111a464d980db162e5254b02-954790ca475a4fa186e91f76ce38b4c6',
    assetHostname: 'https://preview-trial-006.cloud.contensis.com/',
  },
};

// You can export any environment giving them simple aliases such as "dev" and "live"
// to use in the importer code
export const { 'mycontensis-dev': dev, mycontensis: live } = CONTENSIS;
