import { ContentType, Component } from 'contensis-core-api';
import { MappingTemplate } from 'jsonpath-mapper';

import {
  CmsConfiguration,
  MigrateRequest,
  SourceCms,
  TargetCms,
} from 'migratortron';
import { Entry } from '../index';
import { GetTagsArgs } from 'migratortron/dist/services/TagsMigrationService';
import { GetTagGroupsArgs } from 'migratortron/dist/services/TagGroupsMigrationService';

type LoggingOptions = {
  outputLogs?: MigrateRequest['outputLogs'];
  outputProgress?: MigrateRequest['outputProgress'];
};

export type GetContentModelsOptions = {
  source?: SourceCms | CmsConfiguration;
  project?: SourceCms['project'];
  models?: MigrateRequest['models'];
  callback?: MigrateRequest['callback'];
} & LoggingOptions;

export type ImportContentModelsOptions = {
  target?: TargetCms | CmsConfiguration;
  projects?: TargetCms['targetProjects'];
  /** List of content type ids to migrate (only used when migrating directly from one CMS to another) */
  models?: string[];
  /** Content types to import */
  contentTypes?: ContentType[];
  /** Components to import */
  components?: Component[];
  /** Import any entries defined in field defaults */
  entries?: MigrateRequest['entries'];
  /** Import any default parent nodes or nodes defined in form content types */
  nodes?: MigrateRequest['nodes'];
  /** Import any tags attached to default entries */
  tags?: MigrateRequest['tags'];
  /** Import any tag groups defined in tag picker fields */
  tagGroups?: MigrateRequest['tagGroups'];
  /** `false` will exclude any default entries and nodes when migrating content models */
  includeDefaults?: MigrateRequest['includeDefaults'];
  /** `false` will strip field validations in migrated content models */
  includeValidations?: MigrateRequest['includeValidations'];
  callback?: MigrateRequest['callback'];
} & LoggingOptions;

export type GetEntriesOptions = {
  source?: SourceCms | CmsConfiguration;
  project?: SourceCms['project'];
  query?: MigrateRequest['query'];
  zenQL?: MigrateRequest['zenQL'];
  callback?: MigrateRequest['callback'];
  withDependents?: boolean;
  stopLevel?: MigrateRequest['stopLevel'];
} & LoggingOptions;

export type ImportEntriesOptions = {
  target?: TargetCms | CmsConfiguration;
  projects?: TargetCms['targetProjects'];
  /** Entries to import */
  entries?: MigrateRequest['entries'];
  /** Nodes that are dependencies of entries e.g. site view links in canvas fields */
  nodes?: MigrateRequest['nodes'];
  /** Tags that are attached to entries */
  tags?: MigrateRequest['tags'];
  /** Language of the entries to import
   *  - *required* if the target project contains entries with translated versions of entries sharing the same `sys.id`
   *  - *import multilingual content with only one language at a time*, do not mix entry language variants sharing the same `sys.id` in the same operation. */
  language?: string;
  callback?: MigrateRequest['callback'];
  /** Load entries with parallel calls to the Management API */
  concurrency?: MigrateRequest['concurrency'];
  transformGuids?: MigrateRequest['transformGuids'];
} & LoggingOptions;

export type DeleteEntriesOptions = Omit<
  ImportEntriesOptions,
  'concurrency' | 'language' | 'nodes' | 'tags'
> & {
  recycle?: boolean;
};

export type GetTagsOptions = {
  source?: SourceCms | CmsConfiguration;
  project?: SourceCms['project'];
  /** Query to filter the fetched tags */
  query?: GetTagsArgs;
  /** Whether to include dependent tag groups in the results */
  withDependents?: boolean;
} & LoggingOptions;

export type ImportTagsOptions = {
  target?: TargetCms | CmsConfiguration;
  projects?: TargetCms['targetProjects'];
  /** Tags to import */
  tags?: MigrateRequest['tags'];
  /** Tag groups to import with their dependent tags */
  tagGroups?: MigrateRequest['tagGroups'];
  /** Load tags with parallel calls to the Management API */
  concurrency?: MigrateRequest['concurrency'];
  transformGuids?: MigrateRequest['transformGuids'];
} & LoggingOptions;

export type DeleteTagsOptions = Omit<
  ImportTagsOptions,
  'concurrency' | 'transformGuids'
> & {
  query?: GetTagsArgs;
};

export type GetTagGroupsOptions = {
  source?: SourceCms | CmsConfiguration;
  project?: SourceCms['project'];
  /** Query to filter the fetched tag groups */
  query?: GetTagGroupsArgs;
} & LoggingOptions;

export type ImportTagGroupsOptions = {
  target?: TargetCms | CmsConfiguration;
  projects?: TargetCms['targetProjects'];
  /** Tag groups to import */
  tagGroups?: MigrateRequest['tagGroups'];
  /** Load tag groups with parallel calls to the Management API */
  concurrency?: MigrateRequest['concurrency'];
} & LoggingOptions;

export type DeleteTagGroupsOptions = Omit<
  ImportTagGroupsOptions,
  'concurrency'
> & {
  query?: GetTagGroupsArgs;
};

export type GetNodesOptions = {
  rootPath?: string;
  depth?: number;
  source?: SourceCms | CmsConfiguration;
  project?: SourceCms['project'];
  query?: MigrateRequest['query'];
  callback?: MigrateRequest['callback'];
} & LoggingOptions;

export type ImportNodesOptions = {
  target?: TargetCms | CmsConfiguration;
  projects?: TargetCms['targetProjects'];
  nodes?: MigrateRequest['nodes'];
  callback?: MigrateRequest['callback'];
  concurrency?: MigrateRequest['concurrency'];
  transformGuids?: MigrateRequest['transformGuids'];
} & LoggingOptions;

export type DeleteNodesOptions = {
  rootPaths: string | string[];
  target?: TargetCms | CmsConfiguration;
  projects?: TargetCms['targetProjects'];
  callback?: MigrateRequest['callback'];
  concurrency?: MigrateRequest['concurrency'];
} & LoggingOptions;

export type Mappers<S = Entry, T extends Entry = Entry> = {
  [contentTypeId: string]:
    | MappingTemplate<S>
    | ((json: S, modifiers: { source: S[]; results: T[] }) => T | S);
};
