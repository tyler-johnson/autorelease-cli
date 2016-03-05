import Travis from "travis-ci";
import promisify from "es6-promisify";
import parseGithubUrl from "parse-github-url";
import {map,find,includes} from "lodash";
import {stat,writeFile,readFile} from "fs-promise";
import yaml from "js-yaml";

const {pkgname,pkgver} = require("./package.json");

const travisyml = {
	sudo: false,
	language: "node_js",
	cache: {
		directories: ["node_modules"]
	},
	node_js: ["4"],
	before_install: ["npm i -g npm@latest"],
	after_success: ["npm run autorelease"],
	branches: {
		// ignore git tags created by autorelease, like "v1.2.3"
		except: [/^v\d+\.\d+\.\d+$/.toString()]
	}
};

function P(obj, method) {
	return promisify(obj[method].bind(obj));
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncUser(travis) {
	// start syncing user account
	await P(travis.users.sync, "post")();

	// wait for account to finish syncing
	const fetchUser = P(travis.users, "get");
	let user = await fetchUser();
	while (user.is_syncing) {
		await sleep(500);
		user = await fetchUser();
	}
}

async function fetchEnvVars(travis, repoid) {
	let {env_vars} = await P(travis.agent, "request")(
		"GET",
		`/settings/env_vars?repository_id=${repoid}`
	);

	return env_vars;
}

async function saveEnvVar(travis, repoid, vars, name, value) {
	let evar = find(vars, [ "name", name ]);
	let id = evar ? evar.id : null;

	await P(travis.agent, "request")(
			id ? "PATCH" : "POST",
			`/settings/env_vars${id ? '/' + id : ''}?repository_id=${repoid}`,
			{
					env_var: {
							name, value, public: false
					}
			}
	);
}

export default async function(ctx, pkg, pro) {
	let travis = new Travis({
		version: "2.0.0",
		pro,
		headers: {
			"User-Agent": `Travis/2.0 ${pkgname}/${pkgver || "edge"}`
		}
	});

	// sign into travis with github token generated from previous step
	await P(travis, "authenticate")({
		github_token: ctx.env.GH_TOKEN
	});

	// sync the user's account with github
	await syncUser(travis);

	// fetch repo in question
	let {owner,name} = parseGithubUrl(ctx.repository.url);
	let {repo} = await P(travis.repos(owner, name), "get")();

	// ensure that git hooks are enabled on this repo
	let {result} = await P(travis.hooks(repo.id), "put")({
		hook: { active: true }
	});
	if (!result) throw new Error("Could not enable hook on Travis CI");

	// save env variables
	let envvars = await fetchEnvVars(travis, repo.id);
	await Promise.all(map(ctx.env, async (val, name) => {
		await saveEnvVar(travis, repo.id, envvars, name, val);
	}));

	// check if a travis file exists
	let hasTravisFile;
	try {
		await stat(".travis.yml");
		hasTravisFile = true;
	} catch(e) {
		if (e.code !== "ENOENT") throw e;
		hasTravisFile = false;
	}

	// create a travis.yml file if it does not exist
	if (!hasTravisFile) {
		let {addFile} = await prompt([{
			type: "confirm",
			name: "addFile",
			message: "No .travis.yml file found. Should I create one?",
			default: true
		}]);

		if (addFile) {
			await writeFile(".travis.yml", yaml.safeDump(travisyml));
		}
	}

	// otherwise, add the autorelease script to after_success
	else {
		let tyml = yaml.safeLoad(await readFile(".travis.yml", "utf-8"));

		if (!tyml.after_success) tyml.after_success = [];
		if (!includes(tyml.after_success, "npm run autorelease")) {
			tyml.after_success.push("npm run autorelease");
		}

		await writeFile(".travis.yml", yaml.safeDump(tyml));
	}
}