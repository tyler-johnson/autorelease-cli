import Gitlab from "node-gitlab";
import gitlabPromisify from "node-gitlab/lib/promisify";
import {parse,format} from "url";
import {join} from "path";
import {map,size} from "lodash";
import addStep from "../utils/add-step";
import {stat,writeFile} from "fs-promise";
import yaml from "js-yaml";
import prompt from "../utils/prompt";

async function fetchEnvVars(gitlab, id) {
	return await gitlab.request("GET", "/projects/:id/variables", { id });
}

async function saveEnvVar(gitlab, pid, vars, key, value) {
	let exists = vars.some((v) => v.key === key);

	return await gitlab.request(
		exists ? "PUT" : "POST",
		`/projects/:pid/variables${exists ? '/' + key : ''}`,
		{ pid, key, value }
	);
}

const gitlabyml = {
	image: "node:latest",
	stages: ["release"],
	before_script: ["npm install"],
	release_job: {
		stage: "release",
		allow_failure: true,
		script: ["npm run autorelease"],
		only: ["master"],
		cache: {
			paths: ["node_modules/"]
		}
	}
};

export default async function(ctx) {
	// get api url
	let apiurl = parse(ctx.env.GL_URL);
	apiurl.pathname = join(apiurl.pathname || "/", "api/v3");

	// create api handler with url and token from previous step
	let gitlab = Gitlab.create({
		api: format(apiurl)
	});

	// built in auth doesn't support oauth so this is a dirty fix
	gitlab.setAuthentication = function(req) {
		req.params.headers.Authorization = "Bearer " + ctx.env.GL_TOKEN;
		return req;
	};
	gitlab = gitlabPromisify(gitlab);

	// fetch the project (repo) in question
	let {owner,name} = ctx.repository;
	let project = await gitlab.projects.get({
		id: encodeURIComponent(`${owner}/${name}`)
	});

	// ensure that builds are enabled for the project
	if (!project.builds_enabled) await gitlab.projects.update({
		id: project.id,
		builds_enabled: true
	});

	// save env variables
	let envvars = await fetchEnvVars(gitlab, project.id);
	await Promise.all(map(ctx.env, async (val, name) => {
		await saveEnvVar(gitlab, project.id, envvars, name, val);
	}));
	console.warn(`Save ${size(ctx.env)} environement variables to GitLab CI.`);

	// install gitlab ci autorelease stuff
	ctx.install.push("autorelease-gitlab");
	addStep(ctx, "pre", "verify", "autorelease-gitlab/verify-ci");

	// check if a travis file exists
	let hasGitlabFile;
	try {
		await stat(".gitlab-ci.yml");
		hasGitlabFile = true;
	} catch(e) {
		if (e.code !== "ENOENT") throw e;
		hasGitlabFile = false;
	}

	// create a .gitlab-ci.yml file if it does not exist
	if (!hasGitlabFile) {
		let {addFile} = await prompt([{
			type: "confirm",
			name: "addFile",
			message: "No .gitlab-ci.yml file found. Should I create one?",
			default: true
		}]);

		if (addFile) {
			await writeFile(".gitlab-ci.yml", yaml.safeDump(gitlabyml));
		}
	}

	// unlike with travis we can't easily add the script to CI config
	else {
		console.warn(`Note: You'll need to add 'npm run autorelease' to a job in your .gitlab-ci.yml file.`);
	}
}
