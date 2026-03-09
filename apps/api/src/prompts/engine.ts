/**
 * Prompt template engine — SRP: only handles template loading and rendering.
 * Uses Handlebars with file-system backend + hot-reload via chokidar.
 * OCP: add new templates without changing the engine itself.
 */
import { watch } from 'chokidar';
import Handlebars from 'handlebars';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLogger } from '../config/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class PromptEngine {
    private templates = new Map<string, HandlebarsTemplateDelegate>();
    private readonly userPromptsDir: string;
    private readonly defaultPromptsDir: string;

    constructor(userPromptsDir: string, defaultPromptsDir: string) {
        this.userPromptsDir = userPromptsDir;
        this.defaultPromptsDir = defaultPromptsDir;
    }

    /** Initialise: copy defaults to user dir if missing, load all, start watcher */
    async init(): Promise<void> {
        const log = getLogger();
        mkdirSync(this.userPromptsDir, { recursive: true });

        // Copy default prompts to user dir if they don't exist yet
        if (existsSync(this.defaultPromptsDir)) {
            for (const file of readdirSync(this.defaultPromptsDir)) {
                const dest = resolve(this.userPromptsDir, file);
                if (!existsSync(dest)) {
                    copyFileSync(resolve(this.defaultPromptsDir, file), dest);
                    log.info({ file }, 'Copied default prompt to user prompts dir');
                }
            }
        }

        this.loadAll();

        // Hot-reload on file change
        watch(this.userPromptsDir, { ignoreInitial: true }).on('change', (filePath) => {
            const name = basename(filePath, '.hbs');
            this.loadOne(name, filePath);
            log.info({ name }, 'Prompt template reloaded');
        });
    }

    /** Render a named template with context data */
    async render(name: string, data: Record<string, unknown>): Promise<string> {
        const tmpl = this.templates.get(name);
        if (!tmpl) {
            throw new Error(`Prompt template "${name}" not found`);
        }
        return tmpl(data);
    }

    /** Return all template names and their raw source */
    listTemplates(): Array<{ name: string; content: string; isCustom: boolean }> {
        return Array.from(this.templates.keys()).map((name) => {
            const userPath = resolve(this.userPromptsDir, `${name}.hbs`);
            const defaultPath = resolve(this.defaultPromptsDir, `${name}.hbs`);
            const content = existsSync(userPath)
                ? readFileSync(userPath, 'utf8')
                : existsSync(defaultPath)
                    ? readFileSync(defaultPath, 'utf8')
                    : '';
            const isCustom =
                existsSync(userPath) &&
                existsSync(defaultPath) &&
                readFileSync(userPath, 'utf8') !== readFileSync(defaultPath, 'utf8');
            return { name, content, isCustom };
        });
    }

    /** Save (or overwrite) a user prompt template */
    saveTemplate(name: string, content: string): void {
        const path = resolve(this.userPromptsDir, `${name}.hbs`);
        writeFileSync(path, content, 'utf8');
        this.loadOne(name, path);
    }

    /** Reset a template to its default */
    resetTemplate(name: string): void {
        const defaultPath = resolve(this.defaultPromptsDir, `${name}.hbs`);
        if (!existsSync(defaultPath)) throw new Error(`No default template for "${name}"`);
        const content = readFileSync(defaultPath, 'utf8');
        this.saveTemplate(name, content);
    }

    private loadAll(): void {
        const dirs = [this.defaultPromptsDir, this.userPromptsDir].filter(existsSync);
        for (const dir of dirs) {
            for (const file of readdirSync(dir)) {
                if (!file.endsWith('.hbs')) continue;
                this.loadOne(basename(file, '.hbs'), resolve(dir, file));
            }
        }
    }

    private loadOne(name: string, filePath: string): void {
        try {
            const src = readFileSync(filePath, 'utf8');
            this.templates.set(name, Handlebars.compile(src));
        } catch (err) {
            getLogger().error({ name, filePath, err }, 'Failed to load prompt template');
        }
    }
}
