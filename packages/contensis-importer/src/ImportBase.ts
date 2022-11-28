import {
  ContensisMigrationService,
  MigrateRequest,
  SourceCms,
  TargetCms,
} from 'migratortron';
import mapJson from 'jsonpath-mapper';

import { Node as DeliveryNode } from 'contensis-delivery-api/lib/models';
import { Entry, Node } from 'contensis-management-api/lib/models';
import {
  GetContentModelsOptions,
  GetEntriesOptions,
  ImportContentModelsOptions,
  ImportEntriesOptions,
  ImportNodesOptions,
  Mappers,
} from './models/ImportBase.types';
import { chooseMapperByFieldValue } from './util/mapping';

type ImportConstructorArgs = MigrateRequest & {};

type ImportConstructor = (
  args: ImportConstructorArgs,
  commit?: boolean
) => ImportBase;

export class ImportBase {
  commit: boolean;
  source?: MigrateRequest['source'];
  target?: MigrateRequest['target'];
  entries: Entry[] = [];
  models: MigrateRequest['models'] = [];
  nodes: Partial<Node | DeliveryNode>[] = [];
  callback?: MigrateRequest['callback'];
  concurrency?: MigrateRequest['concurrency'];
  transformGuids?: MigrateRequest['transformGuids'];
  query?: MigrateRequest['query'];
  zenQL?: MigrateRequest['zenQL'];

  constructor(
    {
      source,
      target,
      concurrency,
      transformGuids = false,
      query,
      zenQL,
    }: ImportConstructorArgs,
    commit = false
  ) {
    // Set a preview/commit flag via calling script,
    // ensure COMMIT is false by default
    this.commit = process.env.COMMIT === 'true' || commit;
    this.source = source;
    this.target = target;
    this.concurrency = concurrency;
    this.transformGuids = transformGuids;
    this.query = query;
    this.zenQL = zenQL;
  }

  RunImport = async (): Promise<[Error | undefined, any]> => {
    return [new Error('RunImport method not implemented'), undefined];
  };

  /**
   * Get content types, components and compiled "content models" from an import "source" CMS filtering results by a provided query
   * @param options override options set in the import constructor and set proviede a list of specific content models to fetch
   * @returns object containing lists of content types, components and content models with data returned from the Management API
   */
  GetContentModels = async ({
    source = this.source || ({} as SourceCms),
    project = (source as SourceCms)?.project || this.source?.project || '',
    models = this.models,
    callback = this.callback,
  }: GetContentModelsOptions = {}) => {
    const importer = new ContensisMigrationService({
      source: { ...source, project },
      callback,
      models,
    });
    return await importer.GetContentModels();
  };

  /**
   * Migrate provided list of content types and/or components to projects specfied in an import "target" CMS
   * Provided models will be checked against the target for validity and existance
   * This should be used for bulk operations and NOT for looping over to do atomic transactions
   * (this is what the Management API is for and will be much faster to load single entries in this fashion)
   * ImportContentModels respects the "commit" flag set in the import constructor or in "process.env.COMMIT"
   * @param options provide a list of content types and/or components to import and override options set in the import constructor or set specific options for this import
   * @returns [Error, ContentTypesResult] tuple
   */
  ImportContentModels = ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    models = this.models,
    callback = this.callback,
    outputLogs = false,
    outputProgress = true,
  }: ImportContentModelsOptions = {}) => {
    const importer = new ContensisMigrationService(
      {
        target: { ...target, targetProjects: projects },
        models,
        callback,
        outputLogs,
        outputProgress,
      },
      !this.commit
    );
    return importer.MigrateContentModels();
  };

  /**
   * Get entries from an import "source" CMS filtering results by a provided query
   * @param options override options set in the import constructor and set specific options when getting entries for this query
   * @param withDependents default true fetch any dependency entries when returning entries found in the main query
   * @returns list of entries returned from the Management API
   */
  GetEntries = async ({
    source = this.source || ({} as SourceCms),
    project = (source as SourceCms)?.project || this.source?.project || '',
    query = this.query,
    zenQL = this.zenQL,
    callback = this.callback,
    withDependents = true,
  }: GetEntriesOptions = {}) => {
    const importer = new ContensisMigrationService({
      source: { ...source, project },
      query,
      zenQL,
      callback,
    });
    return await importer.GetEntries({ withDependents });
  };

  /**
   * Mapping function to take a list of entries from Delivery or Management API along
   * with a keyed object containing mappers for each contentTypeId/field in each entry
   * and return an array of mapped objects
   * @param {any} entry The source entry we wish to transform
   * @param {object} mappers Object with keys containing mapper templates,
   * the key name matching sys.contentTypeId
   * @param {string} field Only include if we need to match content based on
   * a field other than sys.contentTypeId in the source data
   * @returns {object} Object transformed using a matched content type or
   * a default mapper template, returns an empty object if no mapper template
   * couild be applied.
   */
  MapEntries = <T = Entry, S = Entry>(
    entries: S[],
    mappers: Mappers<S, T>,
    field = 'sys.contentTypeId'
  ) => {
    const results = [] as T[];
    entries.map(entry => {
      const mapper = chooseMapperByFieldValue(entry, mappers, field);
      if (typeof mapper === 'function') {
        const result = mapper(entry, {
          source: entries,
          results,
        });
        if (result) results.push(result);
      } else if (mapper && typeof mapper === 'object')
        results.push(mapJson(entry as S, mapper));
    });

    return results;
  };

  /**
   * Migrate provided list of entries to projects specfied in an import "target" CMS
   * Entries will be checked against the target for validity and existance
   * This should be used for bulk operations and NOT for looping over to do atomic transactions
   * (this is what the Management API is for and will be much faster to load single entries in this fashion)
   * ImportEntries respects the "commit" flag set in the import constructor or in "process.env.COMMIT"
   * @param options provide a list of entries to import and override options set in the import constructor or set specific options for this import
   * @returns [Error, MigrateResult] tuple
   */
  ImportEntries = ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    entries = this.entries,
    callback = this.callback,
    concurrency = this.concurrency,
    outputLogs = false,
    outputProgress = true,
    transformGuids = this.transformGuids,
  }: ImportEntriesOptions = {}) => {
    const importer = new ContensisMigrationService(
      {
        target: { ...target, targetProjects: projects },
        entries,
        callback,
        concurrency,
        outputLogs,
        outputProgress,
        transformGuids,
      },
      !this.commit
    );
    return importer.MigrateEntries();
  };

  /**
   * Migrate provided list of nodes to projects specfied in an import "target" CMS
   * Nodes will be checked against the target for validity and existance
   * This should be used for bulk operations and NOT for looping over to do atomic transactions
   * (this is what the Management API is for and will be much faster to load single entries in this fashion)
   * ImportNodes respects the "commit" flag set in the import constructor or in "process.env.COMMIT"
   * @param options provide a list of nodes to import and override options set in the import constructor or set specific options for this import
   * @returns [Error, NodesResult] tuple
   */
  ImportNodes = ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    nodes = this.nodes,
    callback = this.callback,
    concurrency = this.concurrency,
    outputLogs = false,
    outputProgress = true,
    transformGuids = this.transformGuids,
  }: ImportNodesOptions = {}) => {
    const importer = new ContensisMigrationService(
      {
        target: { ...target, targetProjects: projects },
        nodes,
        callback,
        concurrency,
        outputLogs,
        outputProgress,
        transformGuids,
      },
      !this.commit
    );
    return importer.MigrateNodes();
  };
}

export const createImport: ImportConstructor = (args, commit = false) =>
  new ImportBase(args, commit);
