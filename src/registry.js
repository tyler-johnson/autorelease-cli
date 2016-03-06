import promisify from "es6-promisify";
import _getNpmToken from "get-npm-token";
import addStep from "./utils/add-step";
import prompt from "./utils/prompt";
import npm from "global-npm";

const getNpmToken = promisify(_getNpmToken);

export default async function(ctx) {
	let {type} = await prompt([{
		type: "list",
		name: "type",
		message: "What type of NPM registry are you using?",
		choices: [
			{ name: "Standard NPM (npmjs.org, Sinopia, etc.)", value: "npm" },
			{ name: "Gemfury", value: "gemfury" },
			{ name: "Other (do nothing)", value: "other" }
		],
		default: "npm"
	}]);

	switch (type) {
		case "npm": {
			let {registry,username,email,password} = await prompt([{
				type: "input",
				name: "registry",
				message: "What is the NPM registry URL?",
				default: npm.config.get("registry")
			},{
				type: "input",
				name: "username",
				message: "What is your NPM username?",
				default: npm.config.get("username")
			},{
				type: "input",
				name: "email",
				message: "What is your NPM email?",
				default: npm.config.get("email")
			},{
				type: "password",
				name: "password",
				message: "What is your NPM password?"
			}]);

			ctx.env.NPM_TOKEN = await getNpmToken(registry, username, email, password);
			ctx.publish = "npm publish";
			break;
		}

		case "gemfury": {
			let {user,token} = await prompt([{
				type: "input",
				name: "user",
				message: "What is the username of the Gemfury account that owns this package?"
			},{
				type: "input",
				name: "token",
				message: "What is your Gemfury registry token?"
			}]);

			ctx.env.GEMFURY_USER = user;
			ctx.env.GEMFURY_API_KEY = token;
			addStep(ctx, "pre", "configureNpm", "autorelease-gemfury/configure-npm");
			ctx.install.push("autorelease-gemfury", "@mrgalaxy/furied");
			ctx.publish = "furied";
			break;
		}
	}
}
