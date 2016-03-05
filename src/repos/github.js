import prompt from "../utils/prompt";
import addStep from "../utils/add-step";
import request from "../utils/request";
import {randomBytes} from "crypto";

async function fetchOTP() {
	return (await prompt([{
		type: "input",
		name: "code",
		message: "What is your GitHub two-factor authentication code?"
	}])).code;
}

async function authorize(auth, note, otp, retry) {
	let [resp,body] = await request({
		method: "POST",
		url: "https://api.github.com/authorizations",
		json: true,
		auth,
		headers: {
			"User-Agent": "autorelease",
			"X-GitHub-OTP": otp
		},
		body: {
			scopes: [
				"repo",
				"read:org",
				"user:email",
				"write:repo_hook"
			],
			note: note
		}
	});

	if (resp.statusCode === 201) return body.token;

	if (resp.statusCode === 401 && resp.headers["x-github-otp"]) {
		const type = resp.headers["x-github-otp"].split('; ')[1];

		if (retry) {
			console.warn("Invalid two-factor authentication code.");
		} else {
			console.info(`Two-factor authentication code needed via ${type}.`);
		}

		return await authorize(auth, note, await fetchOTP(), true);
	}

	throw new Error("Could not login to GitHub.");
}

export default async function(ctx) {
	let auth = await prompt([{
		type: "input",
		name: "username",
		message: "What is your GitHub username?"
		// default: conf.get("username")
	}, {
		type: "password",
		name: "password",
		message: "What is your GitHub password?"
		// when: function (answers) {
		//	 if (!info.options.keychain) return true
		//	 if (info.options["ask-for-passwords"]) return true
		//	 return !passwordStorage.get(answers.username)
		// }
	}]);

	let {owner,name} = ctx.repository;
	let token = await authorize(auth, `autorelease-${owner}-${name}-${randomBytes(4).toString("hex")}`);

	ctx.env.GH_TOKEN = token;
	ctx.install.push("autorelease-github");
	addStep(ctx, "pre", "verify", "autorelease-github/verify");
	addStep(ctx, "post", "publishChangelog", "autorelease-github/create-release");
}
