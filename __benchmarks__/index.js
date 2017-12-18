
import { assembleSuite, parseSuite } from './benchmark.parser';
import { executeSuite } from './benchmark.engine';


const options = { async: false, delay: 1 };

parseSuite.run(options);
assembleSuite.run(options);
executeSuite.run(options);
