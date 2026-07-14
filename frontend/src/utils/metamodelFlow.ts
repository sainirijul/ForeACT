import type { Edge, Node } from '@xyflow/react';

export type ApiAttribute = {
  name: string;
  type: string;
  lowerBound?: number;
  upperBound?: number | string;
};

export type ApiReference = {
  name: string;
  target: string;
  containment?: boolean;
  lowerBound?: number;
  upperBound?: number | string;
};

export type ApiGraphNode = {
  id: string;
  label: string;
  stereotype?: string;
  package?: string;
  kind?: string;
  abstract?: boolean;
  isCore?: boolean;
  position?: {
    x: number;
    y: number;
  };
  attributes?: ApiAttribute[];
  references?: ApiReference[];
};

export type ApiGraphEdge = {
  source: string;
  target: string;
  label: string;
  kind?: 'inheritance' | 'composition' | 'association' | string;
};

export type ApiMetamodel = {
  name?: string;
  version?: string;
  nsURI?: string;
  source?: string;
  classes?: ApiGraphNode[];
  graph?: {
    nodes?: ApiGraphNode[];
    edges?: ApiGraphEdge[];
  };
};

function formatAttribute(attr: ApiAttribute): string {
  return `${attr.name}: ${attr.type}`;
}

function formatReference(ref: ApiReference): string {
  const lower = ref.lowerBound ?? 0;
  const upper = ref.upperBound ?? 1;
  return `${ref.name}: ${ref.target} [${lower}..${upper}]`;
}

export function metamodelToFlow(metamodel: ApiMetamodel | null | undefined): {
  nodes: Node[];
  edges: Edge[];
} {
  const apiNodes = metamodel?.graph?.nodes ?? metamodel?.classes ?? [];
  const apiEdges = metamodel?.graph?.edges ?? [];

  const nodes: Node[] = apiNodes.map((node, index) => ({
    id: node.id,
    type: 'umlClass',
    position: node.position ?? {
      x: (index % 5) * 280,
      y: Math.floor(index / 5) * 210,
    },
    data: {
      label: node.label ?? node.id,
      packageName: node.package ?? node.kind ?? 'ForeACT',
      stereotype: node.stereotype ?? (node.abstract ? 'abstract EClass' : 'EClass'),
      abstract: Boolean(node.abstract),
      kind: node.kind ?? 'class',
      isCore: node.isCore ?? true,
      attributes: (node.attributes ?? []).map(formatAttribute),
      references: (node.references ?? []).map(formatReference),
      rawAttributes: node.attributes ?? [],
      rawReferences: node.references ?? [],
    },
  }));

  const edges: Edge[] = apiEdges.map((edge, index) => {
    const isInheritance = edge.kind === 'inheritance' || edge.label === 'extends';
    const isComposition = edge.kind === 'composition' || edge.label.startsWith('◆');

    return {
      id: `edge-${index}-${edge.source}-${edge.target}-${edge.label}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: isInheritance ? 'straight' : 'smoothstep',
      style: {
        strokeWidth: isComposition ? 2.3 : 1.5,
        strokeDasharray: isInheritance ? '6 4' : undefined,
      },
    };
  });

  return { nodes, edges };
}