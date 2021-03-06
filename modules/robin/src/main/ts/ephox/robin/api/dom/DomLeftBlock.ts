import { DomUniverse } from '@ephox/boss';
import { Element } from '@ephox/sugar';
import LeftBlock from '../general/LeftBlock';

const universe = DomUniverse();

const top = function (item: Element) {
  return LeftBlock.top(universe, item);
};

const all = function (item: Element) {
  return LeftBlock.all(universe, item);
};

export default {
  top,
  all
};