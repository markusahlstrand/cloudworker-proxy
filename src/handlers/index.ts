import basicAuth from './basic-auth';
import cache from './cache';
import cors from './cors';
import geoDecorator from './geo-decorator';
import jwt from './jwt';
import kvStorage from './kv-storage';
import kvStorageBinding from './kv-storage-binding';
import lambda from './lambda';
import loadbalancer from './loadbalancer';
import logger from './logger';
import oauth2 from './oauth2';
import origin from './origin';
import response from './response';
import rateLimit from './rate-limit';
import s3 from './s3';
import signature from './signature';
import split from './split';
import transform from './transform';

export default {
  basicAuth,
  cache,
  cors,
  geoDecorator,
  jwt,
  kvStorage,
  kvStorageBinding,
  lambda,
  loadbalancer,
  logger,
  oauth2,
  origin,
  rateLimit,
  response,
  s3,
  signature,
  split,
  transform,
};
