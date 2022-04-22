import {
  ClientSideBaseVisitor,
  ClientSideBasePluginConfig,
  LoadedFragment,
} from '@graphql-codegen/visitor-plugin-common';
import autoBind from 'auto-bind';
import { OperationDefinitionNode, GraphQLSchema, print } from 'graphql';
import { AmplifyAngularRawPluginConfig } from './config';
import { Types } from '@graphql-codegen/plugin-helpers';
import { camelCase } from 'change-case-all';

export interface AmplifyAngularPluginConfig extends ClientSideBasePluginConfig {}

export class AmplifyAngularVisitor extends ClientSideBaseVisitor<
  AmplifyAngularRawPluginConfig,
  AmplifyAngularPluginConfig
> {
  private _operationContent: {
    interfaces: string[];
    methods: string[];
  } = { interfaces: [], methods: [] };

  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: AmplifyAngularRawPluginConfig,
    documents?: Types.DocumentFile[]
  ) {
    super(schema, fragments, rawConfig, {}, documents);

    autoBind(this);
  }

  public getImports(): string[] {
    return [
      `/* eslint-disable */`,
      `import { Injectable } from '@angular/core';`,
      `import API, { graphqlOperation } from '@aws-amplify/api-graphql';`,
    ];
  }

  public getContent() {
    return [
      ...this._operationContent.interfaces,
      '',
      `@Injectable({`,
      `  providedIn: "root"`,
      `})`,
      'export class GeneratedApiService {',
      ...this._operationContent.methods,
      '}\n',
    ].join('\n');
  }

  protected buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: string,
    operationResultType: string,
    operationVariablesTypes: string
  ): string {
    const serviceName = this.convertName(node);
    const firstChild = node.selectionSet.selections[0];
    let firstChildName: string | undefined;
    const noInput = node.variableDefinitions.length === 0;
    const operationResultTypeName = `${serviceName}Result`;
    if (firstChild.kind === 'Field') {
      firstChildName = firstChild.name.value;
      operationResultType = `${operationResultType}['${firstChildName}']`;
    }

    this._operationContent.interfaces.push(`export type ${operationResultTypeName} = ${operationResultType};`);

    let inputVariables = '';
    let inputArgument = '';
    if (!noInput) {
      inputVariables = ', input';
      inputArgument = `input: ${operationVariablesTypes}`;
    }

    const operations = print(node);
    const indentedOperations = operations.replace(/\n/g, '\n    ');
    this._operationContent.methods.push(`
  async ${camelCase(serviceName)}(${inputArgument}): Promise<${operationResultTypeName}> {
    const statement = \`${indentedOperations}\`;
    const response = (await API.graphql(
      graphqlOperation(statement${inputVariables})
    )) as any;
    return response.data${firstChildName != null ? `.${firstChildName}` : ''} as ${operationResultTypeName};
  }`);

    return null;
  }
}
