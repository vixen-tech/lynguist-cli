import type { ExtractionResult } from '@/scanner/types.js'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import type { Preset } from './types.js'

function extract(code: string, filename: string): ExtractionResult[] {
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    })

    const results: ExtractionResult[] = []
    const intlBindings = new Set<string>()

    const traverseFn =
        typeof traverse === 'function' ? traverse : (traverse as unknown as { default: typeof traverse }).default

    traverseFn(ast, {
        VariableDeclarator(path) {
            // Track: const intl = useIntl()
            const id = path.node.id

            if (!t.isIdentifier(id)) return

            const init = path.node.init

            if (!t.isCallExpression(init)) return
            if (!t.isIdentifier(init.callee) || init.callee.name !== 'useIntl') return

            intlBindings.add(id.name)
        },

        CallExpression(path) {
            const callee = path.node.callee

            // Match: intl.formatMessage({ id: 'key' })
            if (
                t.isMemberExpression(callee) &&
                t.isIdentifier(callee.object) &&
                t.isIdentifier(callee.property) &&
                intlBindings.has(callee.object.name) &&
                callee.property.name === 'formatMessage'
            ) {
                const firstArg = path.node.arguments[0]

                if (!firstArg || !t.isObjectExpression(firstArg)) return

                const idProp = firstArg.properties.find(
                    (p): p is t.ObjectProperty => t.isObjectProperty(p) && t.isIdentifier(p.key) && p.key.name === 'id',
                )

                if (idProp && t.isStringLiteral(idProp.value)) {
                    results.push({
                        key: idProp.value.value,
                        namespace: undefined,
                        file: filename,
                        line: path.node.loc?.start.line ?? 0,
                    })
                }
            }
        },

        JSXOpeningElement(path) {
            // Match: <FormattedMessage id="key" />
            const name = path.node.name

            if (!t.isJSXIdentifier(name) || name.name !== 'FormattedMessage') return

            const idAttr = path.node.attributes.find(
                (attr): attr is t.JSXAttribute =>
                    t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'id',
            )

            if (idAttr && t.isStringLiteral(idAttr.value)) {
                results.push({
                    key: idAttr.value.value,
                    namespace: undefined,
                    file: filename,
                    line: path.node.loc?.start.line ?? 0,
                })
            }
        },
    })

    return results
}

export const reactIntlPreset: Preset = {
    name: 'react-intl',
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    extract,
}
