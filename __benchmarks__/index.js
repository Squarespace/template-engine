
import { assembleSuite, parseSuite } from './parser.benchmark';
import { executeSuite } from './engine.benchmark';


const options = { async: false, delay: 1 };

parseSuite.run(options);
assembleSuite.run(options);
executeSuite.run(options);
