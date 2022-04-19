import MappingTemplate from 'jsonpath-mapper/dist/models/Template';
import {
  CmsConfiguration,
  MigrateRequest,
  SourceCms,
  TargetCms,
} from 'migratortron';

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

export type MappingFunction<S, T = any> =
  | ((json: S, modifiers: { source: S[]; results: T[] }) => T)
  | ((json: S) => T)
  | (() => T | void);

export type Mappers<S, T = any> = {
  [contentTypeId: string]: MappingFunction<S, T> | MappingTemplate<S>;
};
