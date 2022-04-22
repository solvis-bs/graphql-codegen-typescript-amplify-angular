import { Types, PluginValidateFn, PluginFunction, oldVisit } from '@graphql-codegen/plugin-helpers';
import { GraphQLSchema, concatAST, Kind, FragmentDefinitionNode } from 'graphql';
import { LoadedFragment } from '@graphql-codegen/visitor-plugin-common';
import { AmplifyAngularVisitor } from './visitor';
import { extname } from 'path';
import { AmplifyAngularRawPluginConfig } from './config';

export const plugin: PluginFunction<AmplifyAngularRawPluginConfig> = (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config
) => {
  const allAst = concatAST(documents.map((v) => v.document));
  const allFragments: LoadedFragment[] = [
    ...(allAst.definitions.filter((d) => d.kind === Kind.FRAGMENT_DEFINITION) as FragmentDefinitionNode[]).map(
      (fragmentDef) => ({
        node: fragmentDef,
        name: fragmentDef.name.value,
        onType: fragmentDef.typeCondition.name.value,
        isExternal: false,
      })
    ),
    ...(config.externalFragments || []),
  ];

  const visitor = new AmplifyAngularVisitor(schema, allFragments, config, documents);
  oldVisit(allAst, { leave: visitor });

  return {
    prepend: visitor.getImports(),
    content: visitor.getContent(),
  };
};

export const validate: PluginValidateFn<any> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config,
  outputFile: string
) => {
  if (extname(outputFile) !== '.ts') {
    throw new Error(`Plugin "amplify-angular" requires extension to be ".ts"!`);
  }
};

export { AmplifyAngularVisitor };
