import { TimeboardType } from '../enums/TimeboardType.js';
import { TimelineColor } from '../enums/TimelineColor.js';

/**
 * Products of the Timeboard platform: each one has its own space (/condoflow, /myfinance) that only shows and
 * creates its timeboard types, and its own license (per account). The platform root (/) presents the products.
 */
export const ProductId = Object.freeze({
  CONDOFLOW: 'condoflow',
  MYFINANCE: 'myfinance'
});

export const PRODUCTS = Object.freeze({
  [ProductId.CONDOFLOW]: Object.freeze({
    id: ProductId.CONDOFLOW,
    name: 'CondoFlow',
    path: 'condoflow',
    color: TimelineColor.CONDOFLOW,
    timeboardType: TimeboardType.CONDOFLOW, // type created in this product
    timeboardTypes: Object.freeze([TimeboardType.CONDOFLOW]),
    isLicensed: true // has paid plans (shared/config/plans.js)
  }),
  [ProductId.MYFINANCE]: Object.freeze({
    id: ProductId.MYFINANCE,
    name: 'MyFinance',
    path: 'myfinance',
    color: TimelineColor.FINANCIAL,
    timeboardType: TimeboardType.FINANCIAL,
    timeboardTypes: Object.freeze([TimeboardType.FINANCIAL]),
    isLicensed: false // free while its plans are not defined
  })
});

export const PRODUCT_LIST = Object.freeze(Object.values(PRODUCTS));

/** Product a timeboard belongs to (null: a type no product shows). */
export const productOfTimeboardType = (type) => PRODUCT_LIST.find((product) => product.timeboardTypes.includes(type)) || null;

export const productByPath = (path) => PRODUCT_LIST.find((product) => product.path === path) || null;
