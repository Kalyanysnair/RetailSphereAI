export interface StageSection {
  id: string;
  title: string;
  description: string;
  weightPct: number;
}

export const getStageSections = (stageName: string = '', jobName: string = ''): StageSection[] => {
  const s = (stageName + ' ' + jobName).toLowerCase();

  // 1. Wood Cutting, CNC & Slicing
  if (s.includes('cut') || s.includes('cnc') || s.includes('dimension') || s.includes('slicing') || s.includes('timber dimensioning')) {
    return [
      {
        id: 'sec-1',
        title: 'Material Inspection & Grain Orientation',
        description: 'Inspect raw timber/sheet stock for grain alignment, moisture grade, and surface defects before cutting.',
        weightPct: 25
      },
      {
        id: 'sec-2',
        title: 'Precision CNC Slicing & Rough Sizing',
        description: 'Set CNC tool coordinates and execute high-precision cross-cuts and dimensioning rips.',
        weightPct: 25
      },
      {
        id: 'sec-3',
        title: 'Edge Planing, Trimming & Sanding',
        description: 'Deburr edges, square stock corners, and plane faces to uniform target thickness.',
        weightPct: 25
      },
      {
        id: 'sec-4',
        title: 'Dimensional Calibration & Tolerance QC',
        description: 'Verify digital caliper measurements to ensure +/- 0.5mm precision tolerance.',
        weightPct: 25
      }
    ];
  }

  // 2. Upholstery & Cushioning
  if (s.includes('upholster') || s.includes('cushion') || s.includes('fabric') || s.includes('leather') || s.includes('foam')) {
    return [
      {
        id: 'sec-1',
        title: 'Fabric Measuring & Pattern Template Cutting',
        description: 'Measure fabric roll, check weave pattern symmetry, and execute template cutting.',
        weightPct: 25
      },
      {
        id: 'sec-2',
        title: 'High-Density Foam Profiling & Webbing',
        description: 'Shape multi-layer ergonomic foam and anchor high-tensile seat webbing.',
        weightPct: 25
      },
      {
        id: 'sec-3',
        title: 'Precision Stitching, Padding & Tufting',
        description: 'Heavy-duty industrial stitching, welt cord application, and button tufting.',
        weightPct: 25
      },
      {
        id: 'sec-4',
        title: 'Seam Quality & Cleanliness Inspection',
        description: 'Inspect seam tension, symmetry, corner tightness, and lint-free packaging prep.',
        weightPct: 25
      }
    ];
  }

  // 3. Surface Finishing, Lacquering, Polishing & Spraying
  if (s.includes('finish') || s.includes('lacquer') || s.includes('polish') || s.includes('stain') || s.includes('paint') || s.includes('varnish')) {
    return [
      {
        id: 'sec-1',
        title: 'Surface Prep & 220-Grit Sanding',
        description: 'Sand all timber surfaces with 220-grit abrasives, fill pores, and vacuum micro-dust.',
        weightPct: 25
      },
      {
        id: 'sec-2',
        title: 'Base Stain & Primer Application',
        description: 'Apply even penetrating stain pigment and sealing primer undercoat.',
        weightPct: 25
      },
      {
        id: 'sec-3',
        title: 'Protective Polyurethane / Lacquer Coating',
        description: 'Spray protective topcoat with uniform wet-film thickness for UV and scratch resistance.',
        weightPct: 25
      },
      {
        id: 'sec-4',
        title: 'Curing, Buffing & Surface Texture Check',
        description: 'Thermal cure, buff with carnauba wax, and inspect for zero run-offs or dust specks.',
        weightPct: 25
      }
    ];
  }

  // 4. Drilling, Pocket Milling & Hardware Mortising
  if (s.includes('drill') || s.includes('milling') || s.includes('pocket') || s.includes('hole') || s.includes('boring')) {
    return [
      {
        id: 'sec-1',
        title: 'Hole Center Jig Marking & Alignment',
        description: 'Verify CNC spindle drill pattern and clamp positioning jigs firmly.',
        weightPct: 25
      },
      {
        id: 'sec-2',
        title: 'Pilot Hole & Pocket Milling Execution',
        description: 'Bore precision depth pockets for cam locks, dowels, and structural fasteners.',
        weightPct: 25
      },
      {
        id: 'sec-3',
        title: 'Burr Removal & Cavity Depth Check',
        description: 'Clear chip debris and verify pocket depths with depth micrometer gauge.',
        weightPct: 25
      },
      {
        id: 'sec-4',
        title: 'Hardware Alignment & Fit Testing',
        description: 'Dry fit test pins and hardware alignment for friction-free assembly.',
        weightPct: 25
      }
    ];
  }

  // 5. Default: Woodwork, Framework, Joinery & Assembly
  return [
    {
      id: 'sec-1',
      title: 'Component Alignment & Dry-Fitting',
      description: 'Check mortise-and-tenon tolerances and dry fit all matching sub-components.',
      weightPct: 25
    },
    {
      id: 'sec-2',
      title: 'Structural Fastening & Wood Glue Bonding',
      description: 'Apply high-strength PVA wood adhesive and secure joints with bar clamps.',
      weightPct: 25
    },
    {
      id: 'sec-3',
      title: 'Hardware, Hinges & Mechanism Installation',
      description: 'Mount heavy-duty steel hardware, drawer slides, and leveling glides.',
      weightPct: 25
    },
    {
      id: 'sec-4',
      title: 'Squareness, Leveling & Stability Inspection',
      description: 'Verify 90-degree corner diagonal equality, weight stability, and wobble-free alignment.',
      weightPct: 25
    }
  ];
};
