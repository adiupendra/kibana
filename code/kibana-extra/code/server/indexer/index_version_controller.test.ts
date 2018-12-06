/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyObject, EsClient } from '@code/esqueue';
import sinon from 'sinon';

import pkg from '../../package.json';
import { Log } from '../log';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { IndexCreationRequest } from './index_creation_request';
import { IndexVersionController } from './index_version_controller';

const log: Log = (new ConsoleLoggerFactory().getLogger(['test']) as any) as Log;

const emptyAsyncFunc = async (_: AnyObject): Promise<any> => {
  Promise.resolve({});
};

const esClient = {
  reindex: emptyAsyncFunc,
  indices: {
    getMapping: emptyAsyncFunc,
    create: emptyAsyncFunc,
    updateAliases: emptyAsyncFunc,
    delete: emptyAsyncFunc,
  },
};

afterEach(() => {
  sinon.restore();
});

test('Index upgrade is triggered.', async () => {
  // Setup the esClient spies
  const getMappingSpy = sinon.fake.returns(
    Promise.resolve({
      mockindex: {
        mappings: {
          mocktype: {
            _meta: {
              version: 0,
            },
          },
        },
      },
    })
  );
  const updateAliasesSpy = sinon.spy();
  const createSpy = sinon.spy();
  const deleteSpy = sinon.spy();
  const reindexSpy = sinon.spy();
  esClient.indices.getMapping = getMappingSpy;
  esClient.indices.updateAliases = updateAliasesSpy;
  esClient.indices.create = createSpy;
  esClient.indices.delete = deleteSpy;
  esClient.reindex = reindexSpy;

  const versionController = new IndexVersionController(esClient as EsClient, log);
  const req: IndexCreationRequest = {
    index: 'mockindex',
    type: 'mocktype',
    settings: {},
    schema: {},
  };
  await versionController.tryUpgrade(req);

  expect(getMappingSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledOnce).toBeTruthy();
  expect(reindexSpy.calledOnce).toBeTruthy();
  expect(updateAliasesSpy.calledOnce).toBeTruthy();
  expect(deleteSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledAfter(getMappingSpy)).toBeTruthy();
  expect(reindexSpy.calledAfter(getMappingSpy)).toBeTruthy();
  expect(updateAliasesSpy.calledAfter(getMappingSpy)).toBeTruthy();
  expect(deleteSpy.calledAfter(getMappingSpy)).toBeTruthy();
});

test('Index upgrade is skipped.', async () => {
  // Setup the esClient spies
  const getMappingSpy = sinon.fake.returns(
    Promise.resolve({
      mockindex: {
        mappings: {
          mocktype: {
            _meta: {
              version: pkg.codeIndexVersion,
            },
          },
        },
      },
    })
  );
  const updateAliasesSpy = sinon.spy();
  const createSpy = sinon.spy();
  const deleteSpy = sinon.spy();
  const reindexSpy = sinon.spy();
  esClient.indices.getMapping = getMappingSpy;
  esClient.indices.updateAliases = updateAliasesSpy;
  esClient.indices.create = createSpy;
  esClient.indices.delete = deleteSpy;
  esClient.reindex = reindexSpy;

  const versionController = new IndexVersionController(esClient as EsClient, log);
  const req: IndexCreationRequest = {
    index: 'mockindex',
    type: 'mocktype',
    settings: {},
    schema: {},
  };
  await versionController.tryUpgrade(req);

  expect(getMappingSpy.calledOnce).toBeTruthy();
  expect(createSpy.notCalled).toBeTruthy();
  expect(reindexSpy.notCalled).toBeTruthy();
  expect(updateAliasesSpy.notCalled).toBeTruthy();
  expect(deleteSpy.notCalled).toBeTruthy();
});
