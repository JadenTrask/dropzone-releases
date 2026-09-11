// Apollyon, MIT. Pure candidate resolvers extracted unchanged from
// js/features/experimental-terrain-correction.js at b1463dab45fb7871a893f14d17f0064ef48e3724.
// Experimental research model; no claim of validated game accuracy.
const finite = value => Number.isFinite(Number(value));
function lowMainInterval(
    nodes,
    distance
) {
    if (
        !Array.isArray(nodes) ||
        nodes.length < 2
    ) {
        return -1;
    }

    if (
        distance < nodes[0] ||
        distance >
            nodes[
                nodes.length - 1
            ]
    ) {
        return -1;
    }

    if (
        distance ===
        Number(
            nodes[
                nodes.length - 1
            ]
        )
    ) {
        return (
            nodes.length -
            2
        );
    }

    let lo = 0;
    let hi =
        nodes.length - 1;

    while (lo + 1 < hi) {
        const mid =
            (lo + hi) >> 1;

        if (
            Number(nodes[mid]) <=
            distance
        ) {
            lo = mid;
        } else {
            hi = mid;
        }
    }

    return lo;
}

function lowMainEnvelope(
    payload,
    boundaryIndex,
    distance
) {
    const representation =
        payload.representation;

    const nodes =
        representation.distanceNodes;

    const mins =
        representation
            .minDeltaZMetersByBoundary[
                boundaryIndex
            ];

    const maxs =
        representation
            .maxDeltaZMetersByBoundary[
                boundaryIndex
            ];

    const interval =
        lowMainInterval(
            nodes,
            distance
        );

    if (interval < 0) {
        return null;
    }

    const d0 =
        Number(nodes[interval]);

    const d1 =
        Number(
            nodes[
                interval + 1
            ]
        );

    const factor =
        d1 === d0
            ? 0
            : (
                distance -
                d0
            ) / (
                d1 -
                d0
            );

    return {
        minDeltaZM:
            Number(mins[interval]) +
            (
                Number(
                    mins[
                        interval + 1
                    ]
                ) -
                Number(
                    mins[
                        interval
                    ]
                )
            ) *
            factor,
        maxDeltaZM:
            Number(maxs[interval]) +
            (
                Number(
                    maxs[
                        interval + 1
                    ]
                ) -
                Number(
                    maxs[
                        interval
                    ]
                )
            ) *
            factor
    };
}

function validateLowMain(payload) {
    if (
        !payload ||
        payload.schema !==
            'wardogs-current-155he-low-command-surface-candidate-v2'
    ) {
        throw new Error(
            'Unsupported LOW main candidate schema'
        );
    }

    const representation =
        payload.representation;

    if (
        !Array.isArray(
            representation?.distanceNodes
        ) ||
        representation
            .distanceNodes
            .length !==
            345 ||
        !Array.isArray(
            representation?.boundariesMrad
        ) ||
        representation
            .boundariesMrad
            .length !==
            45 ||
        !finite(
            representation?.guardMeters
        )
    ) {
        throw new Error(
            'Invalid LOW main candidate payload'
        );
    }

    return true;
}

function resolveLowMain(
    payload,
    distanceM,
    flatMrad,
    deltaZM
) {
    const distance =
        Number(distanceM);

    const flat =
        Number(flatMrad);

    const dz =
        Number(deltaZM);

    if (
        ![
            distance,
            flat,
            dz
        ].every(
            Number.isFinite
        )
    ) {
        return {
            status: 'fallback',
            reason:
                'non-finite-input'
        };
    }

    const domain =
        payload?.domain;

    const selectable =
        payload
            ?.selectableCommandMrad;

    const representation =
        payload?.representation;

    if (
        !domain ||
        !representation ||
        !Array.isArray(selectable) ||
        selectable.length !== 2
    ) {
        return {
            status: 'fallback',
            reason:
                'invalid-payload'
        };
    }

    if (
        distance <
            domain
                .distanceMinMeters ||
        distance >
            domain
                .distanceMaxMeters ||
        flat <
            domain.flatMilMin ||
        flat >
            domain.flatMilMax ||
        dz <
            domain
                .deltaZMinMeters ||
        dz >
            domain
                .deltaZMaxMeters
    ) {
        return {
            status: 'fallback',
            reason:
                'outside-supported-domain'
        };
    }

    const boundaries =
        representation
            .boundariesMrad;

    const guard =
        Number(
            representation
                .guardMeters
        );

    const first =
        lowMainEnvelope(
            payload,
            0,
            distance
        );

    if (
        !first ||
        !finite(guard)
    ) {
        return {
            status: 'fallback',
            reason:
                'invalid-payload'
        };
    }

    if (
        dz <=
        first.maxDeltaZM +
            guard
    ) {
        return {
            status: 'fallback',
            reason:
                'below-minimum-selectable-command'
        };
    }

    let lastCrossed = null;

    for (
        let i = 0;
        i < boundaries.length;
        i++
    ) {
        const envelope =
            lowMainEnvelope(
                payload,
                i,
                distance
            );

        if (!envelope) {
            return {
                status: 'fallback',
                reason:
                    'missing-boundary-envelope'
            };
        }

        const guardedMin =
            envelope.minDeltaZM -
            guard;

        const guardedMax =
            envelope.maxDeltaZM +
            guard;

        if (
            dz >= guardedMin &&
            dz <= guardedMax
        ) {
            return {
                status: 'fallback',
                reason:
                    'family-boundary-envelope',
                boundaryMrad:
                    boundaries[i]
            };
        }

        if (dz > guardedMax) {
            lastCrossed =
                boundaries[i];
            continue;
        }

        if (dz < guardedMin) {
            break;
        }
    }

    if (
        lastCrossed === null
    ) {
        return {
            status: 'fallback',
            reason:
                'no-supported-command-bin'
        };
    }

    const commandMrad =
        Number(lastCrossed) +
        5;

    if (
        commandMrad <
            selectable[0] ||
        commandMrad >
            selectable[1]
    ) {
        return {
            status: 'fallback',
            reason:
                'outside-selectable-command-range'
        };
    }

    return {
        status: 'ok',
        commandMrad
    };
}

function sparseInterval(
    nodes,
    value
) {
    if (
        !Array.isArray(nodes) ||
        nodes.length < 2 ||
        value <
            Number(nodes[0]) ||
        value >
            Number(
                nodes[
                    nodes.length - 1
                ]
            )
    ) {
        return -1;
    }

    if (
        value ===
        Number(
            nodes[
                nodes.length - 1
            ]
        )
    ) {
        return (
            nodes.length -
            2
        );
    }

    let lo = 0;
    let hi =
        nodes.length - 1;

    while (lo + 1 < hi) {
        const mid =
            (lo + hi) >> 1;

        if (
            Number(nodes[mid]) <=
            value
        ) {
            lo = mid;
        } else {
            hi = mid;
        }
    }

    return lo;
}

function interpolateSeries(
    nodes,
    values,
    x
) {
    const index =
        sparseInterval(
            nodes,
            x
        );

    if (
        index < 0 ||
        !Array.isArray(values) ||
        values.length !==
            nodes.length
    ) {
        return null;
    }

    const x0 =
        Number(nodes[index]);

    const x1 =
        Number(
            nodes[
                index + 1
            ]
        );

    const factor =
        x1 === x0
            ? 0
            : (
                x -
                x0
            ) /
            (
                x1 -
                x0
            );

    return (
        Number(values[index]) +
        (
            Number(
                values[
                    index + 1
                ]
            ) -
            Number(
                values[index]
            )
        ) *
        factor
    );
}

function interpolateSparseSegment(
    segment,
    distance
) {
    const nodes =
        segment
            ?.distanceNodes;

    const mins =
        segment
            ?.minDeltaZMeters;

    const maxs =
        segment
            ?.maxDeltaZMeters;

    const index =
        sparseInterval(
            nodes,
            distance
        );

    if (index < 0) {
        return null;
    }

    const d0 =
        Number(nodes[index]);

    const d1 =
        Number(
            nodes[
                index + 1
            ]
        );

    const factor =
        d1 === d0
            ? 0
            : (
                distance -
                d0
            ) /
            (
                d1 -
                d0
            );

    return {
        minDeltaZM:
            Number(mins[index]) +
            (
                Number(
                    mins[
                        index + 1
                    ]
                ) -
                Number(
                    mins[index]
                )
            ) *
            factor,
        maxDeltaZM:
            Number(maxs[index]) +
            (
                Number(
                    maxs[
                        index + 1
                    ]
                ) -
                Number(
                    maxs[index]
                )
            ) *
            factor
    };
}

function lowExtensionEnvelope(
    region,
    boundary,
    distance,
    flatMrad
) {
    for (
        const segment of
        boundary.segments || []
    ) {
        const value =
            interpolateSparseSegment(
                segment,
                distance
            );

        if (value) {
            return value;
        }
    }

    const clip =
        Number(
            region.clipMeters
        );

    if (
        !finite(clip) ||
        !(clip > 0)
    ) {
        return null;
    }

    if (
        boundary.boundaryMrad <
        flatMrad
    ) {
        return {
            minDeltaZM:
                -clip,
            maxDeltaZM:
                -clip
        };
    }

    if (
        boundary.boundaryMrad >
        flatMrad
    ) {
        return {
            minDeltaZM:
                clip,
            maxDeltaZM:
                clip
        };
    }

    return null;
}

function validateLowExtension(
    payload
) {
    if (
        !payload ||
        payload.schema !==
            'wardogs-current-155he-low-tail-apex-candidate-v1'
    ) {
        throw new Error(
            'Unsupported LOW tail/apex candidate schema'
        );
    }

    const reachability =
        payload.reachability;

    if (
        !reachability ||
        !finite(
            reachability.guardMeters
        ) ||
        !Array.isArray(
            reachability.distanceNodes
        ) ||
        !Array.isArray(
            reachability
                .maxPositiveDeltaZMeters
        ) ||
        reachability
            .distanceNodes
            .length !==
            reachability
                .maxPositiveDeltaZMeters
                .length
    ) {
        throw new Error(
            'Invalid LOW tail/apex reachability payload'
        );
    }

    for (
        const key of
        ['tail', 'apex']
    ) {
        const region =
            payload.regions?.[key];

        if (
            !region ||
            region.orientation !==
                'increasing-command-vs-positive-deltaZ' ||
            !finite(
                region.guardMeters
            ) ||
            !finite(
                region.clipMeters
            ) ||
            !Array.isArray(
                region.boundaries
            ) ||
            region
                .boundaries
                .length !==
                58
        ) {
            throw new Error(
                `Invalid LOW ${key} region`
            );
        }
    }

    return true;
}

function chooseLowExtensionRegion(
    payload,
    distance
) {
    const tail =
        payload.regions?.tail;

    const apex =
        payload.regions?.apex;

    if (
        tail &&
        distance >=
            Number(
                tail
                    .distanceMinMeters
            ) &&
        distance <=
            Number(
                tail
                    .distanceMaxMeters
            )
    ) {
        return tail;
    }

    if (
        apex &&
        distance >=
            Number(
                apex
                    .distanceMinMeters
            ) &&
        distance <=
            Number(
                apex
                    .distanceMaxMeters
            )
    ) {
        return apex;
    }

    return null;
}

function resolveLowExtension(
    payload,
    distanceM,
    flatMrad,
    deltaZM
) {
    const distance =
        Number(distanceM);

    const flat =
        Number(flatMrad);

    const dz =
        Number(deltaZM);

    if (
        ![
            distance,
            flat,
            dz
        ].every(
            Number.isFinite
        )
    ) {
        return {
            status: 'fallback',
            reason:
                'non-finite-input'
        };
    }

    const domain =
        payload?.domain;

    const selectable =
        payload
            ?.selectableCommandMrad;

    if (
        !domain ||
        !Array.isArray(selectable) ||
        selectable.length !== 2
    ) {
        return {
            status: 'fallback',
            reason:
                'invalid-payload'
        };
    }

    if (
        distance <
            domain
                .distanceMinMeters ||
        distance >
            domain
                .distanceMaxMeters ||
        dz <
            domain
                .deltaZMinMeters ||
        dz >
            domain
                .deltaZMaxMeters
    ) {
        return {
            status: 'fallback',
            reason:
                'outside-supported-domain'
        };
    }

    const reachability =
        interpolateSeries(
            payload
                .reachability
                .distanceNodes,
            payload
                .reachability
                .maxPositiveDeltaZMeters,
            distance
        );

    const reachabilityGuard =
        Number(
            payload
                .reachability
                .guardMeters
        );

    if (
        !finite(reachability) ||
        !finite(
            reachabilityGuard
        )
    ) {
        return {
            status: 'fallback',
            reason:
                'missing-reachability'
        };
    }

    if (
        dz >
        reachability +
            reachabilityGuard
    ) {
        return {
            status:
                'unreachable',
            reason:
                'terrain-adjusted-low-unreachable',
            reachabilityDeltaZM:
                reachability
        };
    }

    if (
        dz >=
        reachability -
            reachabilityGuard
    ) {
        return {
            status: 'fallback',
            reason:
                'reachability-boundary',
            reachabilityDeltaZM:
                reachability
        };
    }

    const region =
        chooseLowExtensionRegion(
            payload,
            distance
        );

    if (!region) {
        return {
            status: 'fallback',
            reason:
                'outside-supported-domain'
        };
    }

    const guard =
        Number(
            region.guardMeters
        );

    let lastCrossed = null;

    for (
        const boundary of
        region.boundaries
    ) {
        const envelope =
            lowExtensionEnvelope(
                region,
                boundary,
                distance,
                flat
            );

        if (!envelope) {
            return {
                status: 'fallback',
                reason:
                    'missing-boundary-envelope'
            };
        }

        const guardedMin =
            envelope.minDeltaZM -
            guard;

        const guardedMax =
            envelope.maxDeltaZM +
            guard;

        if (
            dz >= guardedMin &&
            dz <= guardedMax
        ) {
            return {
                status: 'fallback',
                reason:
                    'family-boundary-envelope',
                boundaryMrad:
                    boundary
                        .boundaryMrad
            };
        }

        if (dz > guardedMax) {
            lastCrossed =
                Number(
                    boundary
                        .boundaryMrad
                );

            continue;
        }

        if (dz < guardedMin) {
            break;
        }
    }

    if (
        lastCrossed === null
    ) {
        return {
            status: 'fallback',
            reason:
                'below-minimum-selectable-command'
        };
    }

    const commandMrad =
        lastCrossed +
        5;

    if (
        commandMrad <
            selectable[0] ||
        commandMrad >
            selectable[1]
    ) {
        return {
            status: 'fallback',
            reason:
                'outside-selectable-command-range'
        };
    }

    return {
        status: 'ok',
        commandMrad,
        region:
            distance <=
            Number(
                payload
                    .regions
                    .tail
                    .distanceMaxMeters
            )
                ? 'tail'
                : 'apex'
    };
}

function highEnvelope(
    payload,
    boundary,
    distance,
    flatMrad
) {
    for (
        const segment of
        boundary.segments || []
    ) {
        const value =
            interpolateSparseSegment(
                segment,
                distance
            );

        if (value) {
            return value;
        }
    }

    const clip =
        Number(
            payload
                .representation
                .clipMeters
        );

    if (
        !finite(clip) ||
        !(clip > 0)
    ) {
        return null;
    }

    if (
        boundary.boundaryMrad <
        flatMrad
    ) {
        return {
            minDeltaZM:
                clip,
            maxDeltaZM:
                clip
        };
    }

    if (
        boundary.boundaryMrad >
        flatMrad
    ) {
        return {
            minDeltaZM:
                -clip,
            maxDeltaZM:
                -clip
        };
    }

    return null;
}

function validateHigh(
    payload
) {
    if (
        !payload ||
        payload.schema !==
            'wardogs-current-155he-high-v2-command-surface-candidate-v1'
    ) {
        throw new Error(
            'Unsupported HIGH candidate schema'
        );
    }

    const representation =
        payload.representation;

    if (
        !representation ||
        representation.orientation !==
            'decreasing-command-vs-positive-deltaZ' ||
        !finite(
            representation.guardMeters
        ) ||
        !finite(
            representation.clipMeters
        ) ||
        !Array.isArray(
            representation.boundaries
        ) ||
        representation
            .boundaries
            .length !==
            80
    ) {
        throw new Error(
            'Invalid HIGH candidate payload'
        );
    }

    return true;
}

function resolveHigh(
    payload,
    distanceM,
    flatMrad,
    deltaZM
) {
    const distance =
        Number(distanceM);

    const flat =
        Number(flatMrad);

    const dz =
        Number(deltaZM);

    if (
        ![
            distance,
            flat,
            dz
        ].every(
            Number.isFinite
        )
    ) {
        return {
            status: 'fallback',
            reason:
                'non-finite-input'
        };
    }

    const domain =
        payload?.domain;

    const representation =
        payload?.representation;

    const selectable =
        payload
            ?.selectableCommandMrad;

    if (
        !domain ||
        !representation ||
        !Array.isArray(selectable) ||
        selectable.length !== 2
    ) {
        return {
            status: 'fallback',
            reason:
                'invalid-payload'
        };
    }

    if (
        distance <
            domain
                .distanceMinMeters ||
        distance >
            domain
                .distanceMaxMeters ||
        dz <
            domain
                .deltaZMinMeters ||
        dz >
            domain
                .deltaZMaxMeters
    ) {
        return {
            status: 'fallback',
            reason:
                'outside-supported-domain'
        };
    }

    const guard =
        Number(
            representation
                .guardMeters
        );

    for (
        const boundary of
        representation.boundaries
    ) {
        const envelope =
            highEnvelope(
                payload,
                boundary,
                distance,
                flat
            );

        if (!envelope) {
            return {
                status: 'fallback',
                reason:
                    'missing-boundary-envelope'
            };
        }

        const guardedMin =
            envelope.minDeltaZM -
            guard;

        const guardedMax =
            envelope.maxDeltaZM +
            guard;

        if (
            dz >= guardedMin &&
            dz <= guardedMax
        ) {
            return {
                status: 'fallback',
                reason:
                    'family-boundary-envelope',
                boundaryMrad:
                    boundary
                        .boundaryMrad
            };
        }

        if (dz > guardedMax) {
            const commandMrad =
                Number(
                    boundary
                        .boundaryMrad
                ) -
                5;

            if (
                commandMrad <
                    selectable[0] ||
                commandMrad >
                    selectable[1]
            ) {
                return {
                    status:
                        'fallback',
                    reason:
                        'outside-selectable-command-range'
                };
            }

            return {
                status: 'ok',
                commandMrad
            };
        }
    }

    return {
        status: 'fallback',
        reason:
            'above-maximum-selectable-command'
    };
}

export {validateLowMain,validateLowExtension,validateHigh,resolveLowMain,resolveLowExtension,resolveHigh};
