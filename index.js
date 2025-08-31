#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { type } from "os";

console.log(
  chalk.cyan.bold("\n🚀 Welcome to Node-js & Express-js Project Generator!\n")
);

(async () => {
  const answers = await inquirer.prompt([
    {
      name: "projectName",
      message: "Enter project name:",
      default: "my-app",
      validate: (input) =>
        input.trim() !== "" || "Project name cannot be empty",
    },
    {
      type: "list",
      name: "language",
      message: "Choose project language:",
      choices: ["JavaScript", "TypeScript"],
    },
    {
      type: "confirm",
      name: "useMongoDB",
      message: "Do you want to use MongoDB?",
      default: true,
    },
    {
      type: "confirm",
      name: "enableCORS",
      message: "Enable CORS middleware?",
      default: true,
    },
    {
      type: "confirm",
      name: "useErrorHandling",
      message: "Include a global error handling middleware?",
      default: true,
    },
    {
      type: "confirm",
      name: "useEnvFile",
      message: "Create a .env file for environment variables?",
      default: true,
    },
    {
      type: "confirm",
      name: "useMorgan",
      message: "Use Morgan for HTTP request logging?",
      default: false,
    },
    {
      type: "confirm",
      name: "useESLint",
      message: "Enable ESLint for code linting?",
      default: true,
    }
  ]);

  const projectPath = path.join(process.cwd(), answers.projectName);
  if (fs.existsSync(projectPath)) {
    console.log(chalk.red("❌ Folder already exists!"));
    process.exit(1);
  }
  fs.mkdirSync(projectPath);

  // Dependencies
  let dependencies = { express: "^5.1.0" };
  let devDependencies = { nodemon: "^3.1.10" };

  if (answers.useMongoDB) dependencies.mongoose = "^8.0.0";
  if (answers.enableCORS) dependencies.cors = "^2.8.5";
  if (answers.useMorgan) dependencies.morgan = "^1.10.0";
  if (answers.useEnvFile) dependencies.dotenv = "^16.4.7";
  if (answers.language === "TypeScript") {
    devDependencies = {
      ...devDependencies,
      typescript: "^5.3.3",
      "ts-node": "^10.9.2",
      "@types/node": "^20.11.17",
      "@types/express": "^4.17.21",
    };
    if (answers.enableCORS) devDependencies["@types/cors"] = "^2.8.13";
    if (answers.useMorgan) devDependencies["@types/morgan"] = "^1.9.4";
  }
  if (answers.useESLint) devDependencies.eslint = "^8.57.0";

  // package.json
  const packageJson = {
    name: answers.projectName,
    version: "1.0.0",
    ...(answers.language === "JavaScript" ? { type: "module" } : {}),
    scripts: {
      start:
        answers.language === "TypeScript"
          ? "ts-node src/server.ts"
          : "node server.js",
      dev:
        answers.language === "TypeScript"
          ? "nodemon src/server.ts"
          : "nodemon server.js",
    },
    dependencies,
    devDependencies,
  };
  fs.writeFileSync(
    path.join(projectPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  // .env
  if (answers.useEnvFile) {
    fs.writeFileSync(
      path.join(projectPath, ".env"),
      "PORT=5000\nMONGO_URI=mongodb://localhost:27017/mydb"
    );
  }

  if (answers.language === "JavaScript") {
    const folders = ["controllers", "routes", "middlewares", "utils"];
    folders.forEach((folder) => {
      fs.mkdirSync(path.join(projectPath, folder), { recursive: true });
    });
    createJSBoilerplate(projectPath, answers);
  } else {
    fs.mkdirSync(path.join(projectPath, "src"), { recursive: true });
    const folders = ["controllers", "routes", "middlewares", "utils"];
    folders.forEach((folder) => {
      fs.mkdirSync(path.join(projectPath, "src", folder), { recursive: true });
    });
    createTSBoilerplate(projectPath, answers);
  }

  console.log(
    chalk.green(`\n✅ Project ${answers.projectName} created successfully!`)
  );
  console.log(chalk.yellow(`\nNext steps:`));
  console.log(`  cd ${answers.projectName}`);
  console.log(`  npm install`);
  console.log(`  npm run dev\n`);
})();

// JS Boilerplate
function createJSBoilerplate(basePath, options) {
  fs.writeFileSync(
    path.join(basePath, "server.js"),
    `
import express from "express";
${options.enableCORS ? 'import cors from "cors";' : ""}
${options.useMorgan ? 'import morgan from "morgan";' : ""}
import helloRoutes from "./routes/helloRoutes.js";
${
  options.useErrorHandling
    ? 'import { globalErrorHandler } from "./middlewares/errorHandler.js";'
    : ""
}
${
  options.useMongoDB
    ? 'import mongoConnect from "./utils/mongoConnect.js";'
    : ""
}
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());
${options.enableCORS ? "app.use(cors());" : ""}
${options.useMorgan ? 'app.use(morgan("dev"));' : ""}

app.use("/api/hello", helloRoutes);
${options.useErrorHandling ? "app.use(globalErrorHandler);" : ""}

${options.useMongoDB ? `mongoConnect()` : ""}

app.listen(process.env.PORT, () => console.log(\`🚀 Server running on port \${process.env.PORT}\`));
  `.trim()
  );

  fs.writeFileSync(
    path.join(basePath, "controllers", "helloController.js"),
    `
    import { tryCatch } from "../middlewares/errorHandler.js";
    import ErrorHandler from "../utils/errorClass.js";
    export const sayHello = tryCatch((req, res,next) => {
    // if(true)
    // return next(new ErrorHandler("user not found",404)) //this is global error handlder
    res.status(200).json({ success: true, message: "Hello from API!" });
});
  `.trim()
  );

  fs.writeFileSync(
    path.join(basePath, "routes", "helloRoutes.js"),
    `
import { Router } from "express";
import { sayHello } from "../controllers/helloController.js";
const router = Router();
router.get("/", sayHello);
export default router;
  `.trim()
  );

  if (options.useErrorHandling) {
    fs.writeFileSync(
      path.join(basePath, "middlewares", "errorHandler.js"),
      `
       export const globalErrorHandler = (err, req, res, next) => {
        err.message = err.message || "Internal server error";
        err.statusCode = err.statusCode || 500;

        if (err.name === "CastError") {
            err.message = "Invalid ID";
        }

        return res.status(err.statusCode).json({
            status: 500,
            message: err.message
        });
        };

       export const tryCatch = (func) => (req, res, next) => {
        return Promise.resolve(func(req, res, next)).catch(next);
        };

    `.trim()
    );
    fs.writeFileSync(
      path.join(basePath, "utils", "errorClass.js"),
      `
    class ErrorHandler extends Error {
      constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
      }
    }

    export default ErrorHandler;

    `.trim()
    );
  }
  if (options.useMongoDB) {
    fs.writeFileSync(
      path.join(basePath, "utils", "mongoConnect.js"),
      `
        import mongoose from "mongoose";

        const mongoConnect = () => {
        mongoose.connect(process.env.MONGO_URI)
            .then(() => console.log("✅ MongoDB connected"))
            .catch(err => console.error("❌ MongoDB connection error:", err));
        };

        export default mongoConnect;
            `.trim()
    );
  }

  fs.writeFileSync(
    path.join(basePath, "utils", "apiResponse.js"),
    `
    export const success = (data, message = "Success") => ({ success: true, message, data });
    export const error = (message = "Error") => ({ success: false, message });
    `.trim()
  );
}

// TS Boilerplate
function createTSBoilerplate(basePath, options) {
  // tsconfig.json
  fs.writeFileSync(
    path.join(basePath, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          outDir: "./dist",
          esModuleInterop: true,
          noImplicitAny: true,
          strict: true,
          skipLibCheck: true,
        },
      },
      null,
      2
    )
  );

  // server.ts
  fs.writeFileSync(
    path.join(basePath, "src", "server.ts"),
    `
import express, { Application } from "express";
${options.enableCORS ? 'import cors from "cors";' : ""}
${options.useMongoDB ? 'import mongoConnect from "./utils/mongoConnect";' : ""}
${options.useMorgan ? 'import morgan from "morgan";' : ""}
import helloRoutes from "./routes/helloRoutes";
${
  options.useErrorHandling
    ? 'import { globalErrorHandler } from "./middlewares/errorHandler";'
    : ""
}
import dotenv from "dotenv";

dotenv.config();
const app: Application = express();
app.use(express.json());
${options.enableCORS ? "app.use(cors());" : ""}
${options.useMorgan ? 'app.use(morgan("dev"));' : ""}

app.use("/api/hello", helloRoutes);
${options.useErrorHandling ? "app.use(globalErrorHandler);" : ""}
${options.useMongoDB ? "mongoConnect();" : ""}

app.listen(process.env.PORT, () => console.log(\`🚀 Server running on port \${process.env.PORT}\`));
`.trim()
  );

  // controllers
  fs.writeFileSync(
    path.join(basePath, "src/controllers", "helloController.ts"),
    `
import { Request, Response, NextFunction } from "express";
import { tryCatch } from "../middlewares/errorHandler";
import ErrorHandler from "../utils/errorClass";
export const sayHello = tryCatch((req: Request, res: Response,next:NextFunction) => {
  // if(true)
  // return next(new ErrorHandler("user not found",404)) //this is global error handlder
  res.status(200).json({ success: true, message: "Hello from API!" });
});
`.trim()
  );

  // routes
  fs.writeFileSync(
    path.join(basePath, "src/routes", "helloRoutes.ts"),
    `
import { Router } from "express";
import { sayHello } from "../controllers/helloController";

const router = Router();
router.get("/", sayHello);

export default router;
`.trim()
  );

  // middlewares
  if (options.useErrorHandling) {
    fs.writeFileSync(
      path.join(basePath, "src/middlewares", "errorHandler.ts"),
      `
        import { Request, Response, NextFunction } from "express";

        export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
          err.message = err.message || "Internal server error";
          err.statusCode = err.statusCode || 500;

          if (err.name === "CastError") {
            err.message = "Invalid ID";
          }

          return res.status(err.statusCode).json({
            status: err.statusCode,
            message: err.message
          });
        };

        export const tryCatch = (func: Function) => (req: Request, res: Response, next: NextFunction) => {
          return Promise.resolve(func(req, res, next)).catch(next);
        };
`.trim()
    );
    fs.writeFileSync(
      path.join(basePath, "src/utils", "errorClass.ts"),
      `
        class ErrorHandler extends Error{
          constructor(public message:string,public statusCode:number){
              super(message)
              this.statusCode=statusCode
          }
      }

      export default ErrorHandler
`.trim()
    );
  }

  // utils
  fs.writeFileSync(
    path.join(basePath, "src/utils", "apiResponse.ts"),
    `
export const success = (data: any, message = "Success") => ({ success: true, message, data });
export const error = (message = "Error") => ({ success: false, message });
`.trim()
  );

  if (options.useMongoDB) {
    fs.writeFileSync(
      path.join(basePath, "src/utils", "mongoConnect.ts"),
      `
import mongoose from "mongoose";

const mongoConnect = () => {
  mongoose.connect(process.env.MONGO_URI as string)
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));
};

export default mongoConnect;
`.trim()
    );
  }
}
