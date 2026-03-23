import type { Preset } from '@/presets/types.js'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import type { ExtractionResult } from './types.js'

export function extractFromCode(code: string, filename: string, preset: Preset): ExtractionResult[] {
    if (preset.extract) {
        return preset.extract(code, filename)
    }

    let source = code

    if (preset.extractScript) {
        source = preset.extractScript(code, filename)
    }

    const ast = parse(source, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    })

    const results: ExtractionResult[] = []

    // Map: local variable name → namespace (or undefined if no arg given)
    const translatorBindings = new Map<string, string | undefined>()

    // Build a set of hook function names for quick lookup
    const hookNames = new Map((preset.namespaceHooks ?? []).map(h => [h.functionName, h]))

    const memberMethods = new Set(preset.memberMethods ?? [])
    const globalFunctions = new Set(preset.globalFunctions ?? [])

    // We need the actual traverse function — handle CJS/ESM interop
    const traverseFn =
        typeof traverse === 'function' ? traverse : (traverse as unknown as { default: typeof traverse }).default

    traverseFn(ast, {
        VariableDeclarator(path) {
            // Match: const t = useTranslations('Ns')
            // Match: const t = await getTranslations('Ns')
            // Match: const { t } = useTranslation('ns')
            // Match: const { t: translate } = useTranslation('ns')
            const id = path.node.id

            let callExpr: t.CallExpression | null = null
            const init = path.node.init

            if (t.isCallExpression(init)) {
                callExpr = init
            } else if (t.isAwaitExpression(init) && t.isCallExpression(init.argument)) {
                callExpr = init.argument
            }

            if (!callExpr) return

            const callee = callExpr.callee

            if (!t.isIdentifier(callee)) return

            const hook = hookNames.get(callee.name)

            if (!hook) return

            const arg = callExpr.arguments[hook.namespaceArgIndex]
            const namespace = arg && t.isStringLiteral(arg) ? arg.value : undefined

            if (t.isIdentifier(id)) {
                translatorBindings.set(id.name, namespace)
            } else if (t.isObjectPattern(id)) {
                // Destructured: const { t } = useTranslation('ns')
                // or: const { t: translate } = useTranslation('ns')
                for (const prop of id.properties) {
                    if (!t.isObjectProperty(prop)) continue

                    const value = prop.value

                    if (t.isIdentifier(value)) {
                        translatorBindings.set(value.name, namespace)
                    }
                }
            }
        },

        CallExpression(path) {
            const callee = path.node.callee

            // Case 1: t('key') — scoped translator call
            if (t.isIdentifier(callee) && translatorBindings.has(callee.name)) {
                const firstArg = path.node.arguments[0]

                if (!firstArg) return

                if (t.isStringLiteral(firstArg)) {
                    results.push({
                        key: firstArg.value,
                        namespace: translatorBindings.get(callee.name),
                        file: filename,
                        line: path.node.loc?.start.line ?? 0,
                    })
                } else {
                    console.warn(
                        `[lynguist] Skipping non-string-literal argument in ${filename}:${path.node.loc?.start.line}`,
                    )
                }

                return
            }

            // Case 2: t.rich('key'), t.markup('key'), t.raw('key') — member method calls
            if (
                t.isMemberExpression(callee) &&
                t.isIdentifier(callee.object) &&
                t.isIdentifier(callee.property) &&
                translatorBindings.has(callee.object.name) &&
                memberMethods.has(callee.property.name)
            ) {
                const firstArg = path.node.arguments[0]

                if (!firstArg) return

                if (t.isStringLiteral(firstArg)) {
                    results.push({
                        key: firstArg.value,
                        namespace: translatorBindings.get(callee.object.name),
                        file: filename,
                        line: path.node.loc?.start.line ?? 0,
                    })
                } else {
                    console.warn(
                        `[lynguist] Skipping non-string-literal argument in ${filename}:${path.node.loc?.start.line}`,
                    )
                }

                return
            }

            // Case 3: Global function calls like $_('key'), $t('key')
            if (t.isIdentifier(callee) && globalFunctions.has(callee.name)) {
                const firstArg = path.node.arguments[0]

                if (!firstArg) return

                if (t.isStringLiteral(firstArg)) {
                    results.push({
                        key: firstArg.value,
                        namespace: undefined,
                        file: filename,
                        line: path.node.loc?.start.line ?? 0,
                    })
                } else {
                    console.warn(
                        `[lynguist] Skipping non-string-literal argument in ${filename}:${path.node.loc?.start.line}`,
                    )
                }
            }
        },
    })

    return results
}
