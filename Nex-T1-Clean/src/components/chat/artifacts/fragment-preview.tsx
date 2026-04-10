'use client'

import { FragmentInterpreter } from './fragment-interpreter-view'
import { FragmentWeb } from './fragment-web'
import { getTemplateId } from '@/lib/templates'
import {
  ExecutionResult,
  ExecutionResultInterpreter,
  ExecutionResultWeb,
} from '@/lib/types'

export function FragmentPreview({ result }: { result: ExecutionResult }) {
  const templateId = getTemplateId(result.template)
  
  if (templateId === 'code-interpreter-v1') {
    return <FragmentInterpreter result={result as ExecutionResultInterpreter} />
  }

  return <FragmentWeb result={result as ExecutionResultWeb} />
}