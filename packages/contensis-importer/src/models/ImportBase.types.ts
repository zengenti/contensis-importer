import MappingTemplate from 'jsonpath-mapper/dist/models/Template';
import {
  CmsConfiguration,
  MigrateRequest,
  SourceCms,
  TargetCms,
} from 'migratortron';

export type GetContentModelsOptions = {
  source?: SourceCms | CmsConfiguration;
  project?: SourceCms['project'];
  models?: MigrateRequest['models'];
  callback?: MigrateRequest['callback'];
};

export type ImportContentModelsOptions = {
  target?: TargetCms | CmsConfiguration;
  projects?: TargetCms['targetProjects'];
  models?: MigrateRequest['models'];
  callback?: MigrateRequest['callback'];
  outputLogs?: MigrateRequest['outputLogs'];
  outputProgress?: MigrateRequest['outputProgress'];
};

export type GetEntriesOptions = {
  source?: SourceCms | CmsConfiguration;
  project?: SourceCms['project'];
  query?: MigrateRequest['query'];
  zenQL?: MigrateRequest['zenQL'];
  callback?: MigrateRequest['callback'];
  withDependents?: boolean;
};

export type ImportEntriesOptions = {
  target?: TargetCms | CmsConfiguration;
  projects?: TargetCms['targetProjects'];
  entries?: MigrateRequest['entries'];
  callback?: MigrateRequest['callback'];
  concurrency?: MigrateRequest['concurrency'];
  outputLogs?: MigrateRequest['outputLogs'];
  outputProgress?: MigrateRequest['outputProgress'];
  transformGuids?: MigrateRequest['transformGuids'];
};

export type GetNodesOptions = {
  rootPath?: string;
  depth?: number;
  source?: SourceCms | CmsConfiguration;
  project?: SourceCms['project'];
  query?: MigrateRequest['query'];
  callback?: MigrateRequest['callback'];
};

export type ImportNodesOptions = {
  target?: TargetCms | CmsConfiguration;
  projects?: TargetCms['targetProjects'];
  nodes?: MigrateRequest['nodes'];
  callback?: MigrateRequest['callback'];
  concurrency?: MigrateRequest['concurrency'];
  outputLogs?: MigrateRequest['outputLogs'];
  outputProgress?: MigrateRequest['outputProgress'];
  transformGuids?: MigrateRequest['transformGuids'];
};

export type MappingFunction<S, T = any> =
  | ((json: S, modifiers: { source: S[]; results: T[] }) => T)
  | ((json: S) => T)
  | (() => T | void);

export type Mappers<S, T = any> = {
  [contentTypeId: string]: MappingFunction<S, T> | MappingTemplate<S>;
};
