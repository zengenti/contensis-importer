import chalk from 'chalk';
import {
  ContensisMigrationService,
  EntriesResult,
  MigrateRequest,
  SourceCms,
  TagGroupsResult,
  TagsResult,
  TargetCms,
} from 'migratortron';
import mapJson from 'jsonpath-mapper';

import { ContentType, Component } from 'contensis-core-api';
import { Node as DeliveryNode } from 'contensis-delivery-api';
import {
  Entry,
  ICreateTag,
  ICreateTagGroup,
  Node,
  Tag,
  TagGroup,
} from 'contensis-management-api';
import {
  DeleteEntriesOptions,
  DeleteNodesOptions,
  DeleteTagGroupsOptions,
  DeleteTagsOptions,
  GetContentModelsOptions,
  GetEntriesOptions,
  GetNodesOptions,
  GetTagGroupsOptions,
  GetTagsOptions,
  ImportContentModelsOptions,
  ImportEntriesOptions,
  ImportNodesOptions,
  ImportTagsOptions,
  Mappers,
} from './models/ImportBase.types';
import { chooseMapperByFieldValue } from './util/mapping';

type ImportConstructorArgs = Omit<
  MigrateRequest,
  'contentTypes' | 'components'
> & {
  contentTypes?: ContentType[];
  components?: Component[];
};

type ImportConstructor = (
  args: ImportConstructorArgs,
  commit?: boolean
) => ImportBase;

export class ImportBase implements ImportConstructorArgs {
  commit: boolean;
  source?: MigrateRequest['source'];
  target?: MigrateRequest['target'];
  /** Content types to import */
  contentTypes: ContentType[] = [];
  /** Components to import */
  components: Component[] = [];
  /** Entries to import */
  entries: Entry[] = [];
  models: string[] = [];
  /** Nodes to import */
  nodes: Partial<Node | DeliveryNode>[] = [];
  /** Tag groups to import */
  tagGroups: (TagGroup | ICreateTagGroup)[] = [];
  /** Tags to import */
  tags: (Tag | ICreateTag)[] = [];
  callback?: MigrateRequest['callback'];
  concurrency?: MigrateRequest['concurrency'];
  transformGuids?: MigrateRequest['transformGuids'];
  query?: MigrateRequest['query'];
  zenQL?: MigrateRequest['zenQL'];
  outputLogs: MigrateRequest['outputLogs'];
  outputProgress: MigrateRequest['outputProgress'];
  extraArgs: Partial<MigrateRequest>;

  constructor(
    {
      source,
      target,
      concurrency,
      transformGuids = false,
      query,
      zenQL,
      outputLogs = 'warning',
      outputProgress = true,
      contentTypes = [],
      components = [],
      ...extraArgs
    }: ImportConstructorArgs,
    commit = false
  ) {
    console.log(
      chalk.greenBright(`            ..      
      ... .. ..     
   ......... ....   
   ..  ..... . ..   Contensis importer
   ..   ... .  ..   
   .......    ..    
       .......  
`)
    );

    // Set a preview/commit flag via calling script,
    // ensure COMMIT is false by default
    this.commit = process.env.COMMIT === 'true' || commit;
    this.source = source;
    this.target = target;
    this.concurrency = concurrency;
    this.transformGuids = transformGuids;
    this.query = query;
    this.zenQL = zenQL;
    this.outputLogs = outputLogs;
    this.outputProgress = outputProgress;
    this.contentTypes = contentTypes;
    this.components = components;
    this.extraArgs = extraArgs || {};
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
    outputLogs = 'warning',
    outputProgress = true,
  }: GetContentModelsOptions = {}) => {
    const importer = new ContensisMigrationService({
      source: { ...source, project },
      callback,
      models,
      outputLogs,
      outputProgress,
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
    contentTypes = this.contentTypes,
    components = this.components,
    entries = this.entries,
    nodes = this.nodes,
    tags = this.tags,
    tagGroups = this.tagGroups,
    callback = this.callback,
    outputLogs = this.outputLogs,
    outputProgress = this.outputProgress,
    ...additionalOptions
  }: ImportContentModelsOptions = {}) => {
    const importer = new ContensisMigrationService(
      {
        ...this.extraArgs,
        ...additionalOptions,
        target: { ...target, targetProjects: projects },
        models: models.length ? models : [...contentTypes, ...components],
        entries,
        nodes,
        tags,
        tagGroups,
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
  GetEntries = async <T extends Entry = Entry>({
    source = this.source || ({} as SourceCms),
    project = (source as SourceCms)?.project || this.source?.project || '',
    query = this.query,
    zenQL = this.zenQL,
    callback = this.callback,
    withDependents = true,
    outputLogs = 'warning',
    outputProgress = true,
    ...additionalOptions
  }: GetEntriesOptions = {}) => {
    const importer = new ContensisMigrationService({
      ...additionalOptions,
      source: { ...source, project },
      query,
      zenQL,
      callback,
      outputLogs,
      outputProgress,
    });
    return (await importer.GetEntries({ withDependents })) as T[];
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
  MapEntries = <T extends Entry = Entry, S extends Entry = Entry>(
    entries: Entry[] | S[],
    mappers: Mappers<S, T>,
    field = 'sys.contentTypeId'
  ) => {
    const results = [] as T[];
    entries.forEach(entry => {
      const mapper = chooseMapperByFieldValue<S, Mappers<S, T>>(
        entry as S,
        mappers,
        field
      );
      if (typeof mapper === 'function') {
        const result = mapper(entry as S, {
          source: entries as S[],
          results,
        });
        if (result) results.push(result as T);
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
   * @param options provide a list of entries to import and override options set in the import constructorto set specific options for this import
   * @returns [Error, MigrateResult] tuple
   */
  ImportEntries = ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    entries = this.entries,
    tags = this.tags,
    language = this.query?.languages?.[0],
    callback = this.callback,
    concurrency = this.concurrency,
    outputLogs = this.outputLogs,
    outputProgress = this.outputProgress,
    transformGuids = this.transformGuids,
  }: ImportEntriesOptions = {}) => {
    const importer = new ContensisMigrationService(
      {
        ...this.extraArgs,
        target: { ...target, targetProjects: projects },
        entries,
        tags,
        query: language ? { languages: [language] } : undefined,
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
   * Delete provided list of entries in projects specfied as a "target" CMS
   * Entries will be checked against the target for validity and existance
   * This should be used for bulk operations and NOT for looping over to do atomic transactions
   * (this is what the Management API is for and will be much faster to load single entries in this fashion)
   * DeleteEntries respects the "commit" flag set in the import constructor or in "process.env.COMMIT"
   * @param options provide a list of entries to delete and override options set in the import constructor to set specific options for this import
   * @returns [Error, MigrateResult] tuple
   */
  DeleteEntries = async ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    entries = this.entries,
    recycle = false,
    callback = this.callback,
    outputLogs = this.outputLogs,
    outputProgress = this.outputProgress,
    transformGuids = this.transformGuids,
  }: DeleteEntriesOptions = {}): Promise<
    [Error | null, EntriesResult | undefined]
  > => {
    if (!entries.length)
      return [new Error('No entries supplied to delete'), undefined];
    const importer = new ContensisMigrationService(
      {
        ...this.extraArgs,
        target: { ...target, targetProjects: projects },
        entries,
        callback,
        outputLogs,
        outputProgress,
        transformGuids,
      },
      !this.commit
    );
    return importer.DeleteEntries(recycle);
  };
  /**
   * Get tags from an import "source" CMS filtering results by a provided query
   * @param options override options set in the import constructor and set specific options when getting tags for this query
   * @returns list of tags returned from the Management API, includes TagGroups if withDependents is true
   */
  GetTags = async (
    {
      source = this.source || ({} as SourceCms),
      project = (source as SourceCms)?.project || this.source?.project || '',
      query,
      withDependents,
      outputLogs = this.outputLogs,
      outputProgress = this.outputProgress,
      ...additionalOptions
    }: GetTagsOptions = {} as GetTagsOptions
  ) => {
    const importer = new ContensisMigrationService({
      ...additionalOptions,
      source: { ...source, project },
      outputLogs,
      outputProgress,
    });
    return await importer.GetTags({
      ...query,
      withDependents: withDependents ?? false,
    });
  };

  /**
   * Migrate provided list of tags to projects specfied in an import "target" CMS
   * Tags will be checked against the target for validity and existance
   * This should be used for bulk operations and NOT for looping over to do atomic transactions
   * (this is what the Management API is for and will be much faster to load single entries in this fashion)
   * ImportTags respects the "commit" flag set in the import constructor or in "process.env.COMMIT"
   * @param options provide a list of tags to import and override options set in the import constructor to set specific options for this import
   * @returns [Error, MigrateResult] tuple
   */
  ImportTags = ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    tags = this.tags,
    tagGroups = this.tagGroups,
    concurrency = this.concurrency,
    outputLogs = this.outputLogs,
    outputProgress = this.outputProgress,
    transformGuids = this.transformGuids,
  }: ImportTagsOptions = {}) => {
    const importer = new ContensisMigrationService(
      {
        ...this.extraArgs,
        target: { ...target, targetProjects: projects },
        tags,
        tagGroups,
        concurrency,
        outputLogs,
        outputProgress,
        transformGuids,
      },
      !this.commit
    );
    return importer.MigrateTags();
  };

  /**
   * Delete provided list of tags in projects specfied as a "target" CMS
   * Tags will be checked against the target for validity and existance
   * This should be used for bulk operations and NOT for looping over to do atomic transactions
   * (this is what the Management API is for and will be much faster to load single entries in this fashion)
   * DeleteTags respects the "commit" flag set in the import constructor or in "process.env.COMMIT"
   * @param options provide a list of tags to delete and override options set in the import constructor to set specific options for this import
   * @returns [Error, MigrateResult] tuple
   */
  DeleteTags = async ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    tags = this.tags,
    query,
    outputLogs = this.outputLogs,
    outputProgress = this.outputProgress,
  }: DeleteTagsOptions = {}): Promise<
    [Error | null, TagsResult | undefined]
  > => {
    if (!tags.length)
      return [new Error('No tags supplied to delete'), undefined];
    const importer = new ContensisMigrationService(
      {
        ...this.extraArgs,
        target: { ...target, targetProjects: projects },
        tags,
        outputLogs,
        outputProgress,
      },
      !this.commit
    );
    return importer.DeleteTags(query);
  };
  /**
   * Get tag groups from an import "source" CMS filtering results by a provided query
   * @param options override options set in the import constructor and set specific options when getting tag groups for this query
   * @returns Promise that resolves to a list of tag groups returned from the Management API
   */
  GetTagGroups = async (
    {
      source = this.source || ({} as SourceCms),
      project = (source as SourceCms)?.project || this.source?.project || '',
      query,
      outputLogs = this.outputLogs,
      outputProgress = this.outputProgress,
      ...additionalOptions
    }: GetTagGroupsOptions = {} as GetTagGroupsOptions
  ) => {
    const importer = new ContensisMigrationService({
      ...additionalOptions,
      source: { ...source, project },
      outputLogs,
      outputProgress,
    });
    return await importer.GetTagGroups(query);
  };

  /**
   * Migrate provided list of tags to projects specfied in an import "target" CMS
   * Tags will be checked against the target for validity and existance
   * This should be used for bulk operations and NOT for looping over to do atomic transactions
   * (this is what the Management API is for and will be much faster to load single entries in this fashion)
   * ImportTags respects the "commit" flag set in the import constructor or in "process.env.COMMIT"
   * @param options provide a list of tags to import and override options set in the import constructor to set specific options for this import
   * @returns [Error, MigrateResult] tuple
   */
  ImportTagGroups = ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    tags = this.tags,
    tagGroups = this.tagGroups,
    concurrency = this.concurrency,
    outputLogs = this.outputLogs,
    outputProgress = this.outputProgress,
    transformGuids = this.transformGuids,
  }: ImportTagsOptions = {}) => {
    const importer = new ContensisMigrationService(
      {
        ...this.extraArgs,
        target: { ...target, targetProjects: projects },
        tags,
        tagGroups,
        concurrency,
        outputLogs,
        outputProgress,
        transformGuids,
      },
      !this.commit
    );
    return importer.MigrateTags();
  };

  /**
   * Delete provided list of tag groups in projects specfied as a "target" CMS
   * Tag groups will be checked against the target for validity and existance
   * This should be used for bulk operations and NOT for looping over to do atomic transactions
   * (this is what the Management API is for and will be much faster to load single entries in this fashion)
   * DeleteTagGroups respects the "commit" flag set in the import constructor or in "process.env.COMMIT"
   * @param options provide a list of tag groups to delete and override options set in the import constructor to set specific options for this import
   * @returns [Error, MigrateResult] tuple
   */
  DeleteTagGroups = async ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    tagGroups = this.tagGroups,
    query,
    outputLogs = this.outputLogs,
    outputProgress = this.outputProgress,
  }: DeleteTagGroupsOptions = {}): Promise<
    [Error | null, TagGroupsResult | undefined]
  > => {
    if (!tagGroups.length)
      return [new Error('No tag groups supplied to delete'), undefined];
    const importer = new ContensisMigrationService(
      {
        ...this.extraArgs,
        target: { ...target, targetProjects: projects },
        tagGroups,
        outputLogs,
        outputProgress,
      },
      !this.commit
    );
    return importer.DeleteTagGroups(query);
  };

  /**
   * Get nodes from an import "source" CMS filtering results by a provided query
   * @param options override options set in the import constructor and set specific options when getting node for this query
   * @returns list of nodes returned from the Management API
   */
  GetNodes = async ({
    rootPath,
    depth,
    source = this.source || ({} as SourceCms),
    project = (source as SourceCms)?.project || this.source?.project || '',
    query = this.query,
    callback = this.callback,
    outputLogs = 'warning',
    outputProgress = true,
  }: GetNodesOptions = {}) => {
    const importer = new ContensisMigrationService({
      source: { ...source, project },
      query,
      callback,
      outputLogs,
      outputProgress,
    });
    return await importer.GetNodes(rootPath, depth);
  };

  /**
   * Migrate provided list of nodes to projects specfied in an import "target" CMS
   * Nodes will be checked against the target for validity and existance
   * This should be used for bulk operations and NOT for looping over to do atomic transactions
   * (this is what the Management API is for and will be much faster to load single entries in this fashion)
   * ImportNodes respects the "commit" flag set in the import constructor or in "process.env.COMMIT"
   * @param options provide a list of nodes to import and override options set in the import constructor to set specific options for this import
   * @returns [Error, NodesResult] tuple
   */
  ImportNodes = ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    nodes = this.nodes,
    callback = this.callback,
    concurrency = this.concurrency,
    outputLogs = this.outputLogs,
    outputProgress = this.outputProgress,
    transformGuids = this.transformGuids,
  }: ImportNodesOptions = {}) => {
    const importer = new ContensisMigrationService(
      {
        ...this.extraArgs,
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

  /**
   * Delete nodes and any children from the provided root path(s) from projects specfied as a "target" CMS
   * Nodes will be checked against the target for validity and existance
   * DeleteNodes respects the "commit" flag set in the import constructor or in "process.env.COMMIT"
   * @param options provide a list of nodes to delete and override options set in the import constructor to set specific options for this import
   * @returns [Error, NodesResult] tuple
   */
  DeleteNodes = ({
    target = this.target || ({} as TargetCms),
    projects = (target as TargetCms)?.targetProjects ||
      this.target?.targetProjects,
    callback = this.callback,
    concurrency = this.concurrency,
    outputLogs = this.outputLogs,
    outputProgress = this.outputProgress,
    rootPaths,
  }: DeleteNodesOptions) => {
    const importer = new ContensisMigrationService(
      {
        ...this.extraArgs,
        target: { ...target, targetProjects: projects },
        callback,
        concurrency,
        outputLogs,
        outputProgress,
      },
      !this.commit
    );
    return importer.DeleteNodes(rootPaths);
  };
}

export const createImport: ImportConstructor = (args, commit = false) =>
  new ImportBase(args, commit);
