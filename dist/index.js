/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 407:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@actions/core'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())));
const github = __importStar(__nccwpck_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@actions/github'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())));
async function run() {
    try {
        const token = core.getInput('github-token', { required: true });
        const daysInactive = Number.parseInt(core.getInput('days-inactive'), 10);
        const labels = {
            stale: core.getInput('stale'),
            ignore: core.getInput('ignore')
                .split(',')
                .map(label => label.trim().toLowerCase())
                .filter(Boolean),
        };
        const octokit = github.getOctokit(token);
        const { owner, repo } = github.context.repo;
        const maintainers = new Set(['OWNER', 'COLLABORATOR', 'MEMBER']);
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - daysInactive);
        async function fresh(issueNumber) {
            try {
                await octokit.rest.issues.removeLabel({
                    owner,
                    repo,
                    issue_number: issueNumber,
                    name: labels.stale,
                });
            }
            catch (error) {
                if (typeof error === 'object'
                    && error !== null
                    && 'status' in error
                    && error.status === 404) {
                    return;
                }
                throw error;
            }
        }
        const { data: issues } = await octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: 'open',
            sort: 'updated',
            direction: 'desc',
            per_page: 100,
        });
        for (const issue of issues) {
            if (issue.pull_request)
                continue;
            const issueLabels = issue.labels.flatMap((label) => {
                if (typeof label === 'string')
                    return [label.toLowerCase()];
                if (typeof label.name === 'string')
                    return [label.name.toLowerCase()];
                return [];
            });
            const labeled = {
                stale: issueLabels.includes(labels.stale.toLowerCase()),
                ignore: issueLabels.some(label => labels.ignore.includes(label)),
            };
            if (labeled.ignore) {
                if (labeled.stale) {
                    core.info(`Issue #${issue.number}: Removing stale label because it has an ignored label`);
                    await fresh(issue.number);
                }
                continue;
            }
            const updated = new Date(issue.updated_at);
            if (updated > threshold) {
                if (labeled.stale) {
                    core.info(`Issue #${issue.number}: Removing stale label because issue is active`);
                    await fresh(issue.number);
                }
                continue;
            }
            if (issue.comments === 0) {
                if (labeled.stale) {
                    core.info(`Issue #${issue.number}: Removing stale label because issue has no comments`);
                    await fresh(issue.number);
                }
                continue;
            }
            const { data: comments } = await octokit.rest.issues.listComments({
                owner,
                repo,
                issue_number: issue.number,
                per_page: 1,
                sort: 'created',
                direction: 'desc',
            });
            const lastComment = comments[0];
            const role = lastComment?.author_association;
            const shouldBeStale = typeof role === 'string' && maintainers.has(role);
            if (shouldBeStale && !labeled.stale) {
                core.info(`Issue #${issue.number}: Last active user role was ${role}`);
                await octokit.rest.issues.addLabels({
                    owner,
                    repo,
                    issue_number: issue.number,
                    labels: [labels.stale],
                });
            }
            else if (!shouldBeStale && labeled.stale) {
                core.info(`Issue #${issue.number}: Removing stale label because last comment was not from a maintainer`);
                await fresh(issue.number);
            }
        }
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
        else {
            core.setFailed('An unexpected error occurred');
        }
    }
}
void run();


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(407);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;