import promisify from "es6-promisify";
import npm from "global-npm";
import {readJSON} from "./utils/json";
import registry from "./registry";
import repo from "./repo";
import ci from "./ci";
import final from "./final";

export default async function() {
	await promisify(npm.load.bind(npm))({});

	let ctx = {
		env: {}, // environment vars
		options: {}, // autorelease options
		install: [], // extra packages to install
		publishConfig: {}, // npm publish config
		publish: null, // command to release
		package: await readJSON("./package.json") // the local packagejson
	};

	await registry(ctx);
	await repo(ctx);
	await ci(ctx);
	await final(ctx);
}
