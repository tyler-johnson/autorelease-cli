import prompt from "../utils/prompt";
import request from "../utils/request";
import addStep from "../utils/add-step";
import {parse,format} from "url";
import {pick} from "lodash";

export default async function(ctx) {
	let url = format(pick(parse(ctx.repository.url), "host", "protocol"));
	if (!url) {
		url = (await prompt([{
			type: "input",
			name: "url",
			message: "What is your GitLab EE base URL?",
			default: url
		}])).url;
	} else {
		console.warn("Assuming GitLab.com is being used based on repo URL.");
	}

	let {username,password} = await prompt([{
		type: "input",
		name: "username",
		message: "What is your GitLab username?"
		// default: conf.get("username")
	}, {
		type: "password",
		name: "password",
		message: "What is your GitLab password?"
		// when: function (answers) {
		//	 if (!info.options.keychain) return true
		//	 if (info.options["ask-for-passwords"]) return true
		//	 return !passwordStorage.get(answers.username)
		// }
	}]);

	let [resp,body] = await request({
		method: "POST",
		url: "/oauth/token",
		baseUrl: url,
		json: true,
		body: {
			grant_type: "password",
			username, password
		}
	});

	if (resp.statusCode !== 200) {
		throw new Error(body);
	}

	ctx.env.GL_TOKEN = body.access_token;
	ctx.env.GL_URL = url;
	ctx.install.push("autorelease-gitlab");
	addStep(ctx, "pre", "verify", "autorelease-gitlab/verify");
	addStep(ctx, "post", "publishChangelog", "autorelease-gitlab/create-release");
}
