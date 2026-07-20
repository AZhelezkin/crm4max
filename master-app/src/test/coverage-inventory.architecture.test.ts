import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const PROJECT_ROOT = resolve(process.cwd())
const SOURCE_ROOT = join(PROJECT_ROOT, 'src')
const COVERAGE_MATRIX = readFileSync(join(PROJECT_ROOT, 'docs/testing/coverage-matrix.md'), 'utf8')

function collectProductionSourceFiles(directory = SOURCE_ROOT): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const absolute = join(directory, entry)
      if (statSync(absolute).isDirectory()) {
        if (entry === 'test') return []
        return collectProductionSourceFiles(absolute)
      }
      if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry) || entry.endsWith('.d.ts')) return []
      return [relative(PROJECT_ROOT, absolute).replace(/\\/g, '/')]
    })
    .sort()
}

function hasExportModifier(node: ts.Node) {
  return ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
}

function propertyNameText(name: ts.PropertyName | undefined) {
  if (!name) return null
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text
  return null
}

function exportedApiMethods() {
  const apiFiles = collectProductionSourceFiles().filter((path) =>
    (/^src\/(client\/)?api\/.*\.ts$/.test(path) || path === 'src/standalone-pages/handoff/destination-selector/api.ts')
    && !path.endsWith('/client.ts'),
  )
  const methods: string[] = []

  for (const path of apiFiles) {
    const sourceText = readFileSync(join(PROJECT_ROOT, path), 'utf8')
    const source = ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    for (const statement of source.statements) {
      if (ts.isFunctionDeclaration(statement) && hasExportModifier(statement) && statement.name) {
        methods.push(`${path}#${statement.name.text}`)
      }
      if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) continue
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) continue
        for (const property of declaration.initializer.properties) {
          if (!ts.isPropertyAssignment(property) && !ts.isMethodDeclaration(property)) continue
          const method = propertyNameText(property.name)
          if (method) methods.push(`${path}#${declaration.name.text}.${method}`)
        }
      }
    }
  }

  return methods.sort()
}

function declaredRoutes(path: 'src/App.tsx' | 'src/client/ClientApp.tsx') {
  const source = readFileSync(join(PROJECT_ROOT, path), 'utf8')
  return Array.from(source.matchAll(/<Route\s+[^>]*path="([^"]+)"/g), (match) => match[1])
}

describe('coverage route and API inventory', () => {
  it('требует coverage-matrix row для каждого declared route', () => {
    const masterRoutes = declaredRoutes('src/App.tsx')
    const clientRoutes = declaredRoutes('src/client/ClientApp.tsx')
    const missing: string[] = []

    for (const route of masterRoutes) {
      if (route === '*') {
        if (!COVERAGE_MATRIX.includes('master wildcard')) missing.push('master wildcard')
        continue
      }
      const normalized = route.startsWith('/') ? route : `/${route}`
      if (!COVERAGE_MATRIX.includes(`\`${normalized}\``)) missing.push(`master ${normalized}`)
    }
    for (const route of clientRoutes) {
      if (route === '*') {
        if (!COVERAGE_MATRIX.includes('client wildcard')) missing.push('client wildcard')
        continue
      }
      if (!COVERAGE_MATRIX.includes(`\`${route}\``)) missing.push(`client ${route}`)
    }

    expect(missing, `Routes missing coverage rows: ${missing.join(', ')}`).toEqual([])
  })

  it('требует machine-readable coverage entry для каждого exported API method', () => {
    const methods = exportedApiMethods()
    const missing = methods.filter((method) => !COVERAGE_MATRIX.includes(`\`${method}\``))

    expect(missing, `API methods missing coverage entries:\n${missing.join('\n')}`).toEqual([])
    expect(methods.length).toBeGreaterThan(40)
  })
})
