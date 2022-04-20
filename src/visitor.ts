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

  protected buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: string,
    operationResultType: string,
    operationVariablesTypes: string
  ): string {
    const serviceName = `${camelCase(this.convertName(node))}${operationType}`;
    const firstChild = node.selectionSet.selections[0];
    let firstChildName: string | undefined;
    if (firstChild.kind === 'Field') {
      firstChildName = firstChild.name.value;
      operationResultType = `${operationResultType}['${firstChildName}']`;
    }
    const operations = print(node);
    const indentedOperations = operations.replace(/\n/g, '\n    ');

    const content = `
  async ${serviceName}(input:${operationVariablesTypes}): Promise<${operationResultType}> {
    const statement = \`${indentedOperations}\`;
    const response = (await API.graphql(
      graphqlOperation(statement, input)
    )) as any;
    return response.data${firstChildName != null ? `.${firstChildName}` : ''} as ${operationResultType};
  }`;

    return content;
  }
}
