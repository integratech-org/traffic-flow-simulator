"""
Regenerate network.json with 2.5m cell size (paper specification).

This script:
1. Reads the current network.json (7.5m cells, 73 cells/lane)
2. Interpolates coordinates to create 2.5m spacing
3. Generates 219 cells per lane (3x more) to maintain 547.5m physical length
4. Writes new network.json with updated cellSizeMeters and cellCoords

Usage:
    python backend/scripts/regenerate_network_2_5m.py
"""

import json
from pathlib import Path

import numpy as np


def interpolate_coordinates(
    coords_7_5m: list[list[float]],
    target_cell_size: float = 2.5,
    current_cell_size: float = 7.5,
) -> list[list[float]]:
    """
    Interpolate coordinates from 7.5m spacing to 2.5m spacing.

    Args:
        coords_7_5m: List of [lon, lat] pairs spaced 7.5m apart
        target_cell_size: Desired cell size in meters (2.5m)
        current_cell_size: Current cell size in meters (7.5m)

    Returns:
        List of [lon, lat] pairs spaced 2.5m apart
    """
    coords_array = np.array(coords_7_5m)

    # Calculate how many new points we need
    ratio = current_cell_size / target_cell_size  # 7.5 / 2.5 = 3
    num_original = len(coords_array)
    num_new = int((num_original - 1) * ratio) + 1  # 73 -> 219

    # Create parameter values for interpolation
    # Original points are at t = 0, 3, 6, 9, ..., (num_original-1)*3
    t_original = np.arange(num_original) * ratio

    # New points are at t = 0, 1, 2, 3, ..., num_new-1
    t_new = np.arange(num_new)

    # Interpolate lon and lat separately
    lon_interp = np.interp(t_new, t_original, coords_array[:, 0])
    lat_interp = np.interp(t_new, t_original, coords_array[:, 1])

    # Combine back into [lon, lat] pairs
    new_coords = [[float(lon), float(lat)] for lon, lat in zip(lon_interp, lat_interp)]

    return new_coords


def main() -> None:
    # Paths
    project_root = Path(__file__).parent.parent.parent
    current_network_path = (
        project_root / "backend" / "src" / "network" / "data" / "network.json"
    )
    new_network_path = (
        project_root / "backend" / "src" / "network" / "data" / "network_2.5m.json"
    )

    print(f"📖 Reading network from: {current_network_path}")

    # Read current network
    with open(current_network_path, "r", encoding="utf-8") as f:
        network = json.load(f)

    print(f"Current cell size: {network['cellSizeMeters']}m")
    print(f"Total lanes: {len(network['lanes'])}")

    # Update cell size
    network["cellSizeMeters"] = 2.5

    # Process each lane
    lanes_processed = 0
    for lane_id, lane_data in network["lanes"].items():
        original_coords = lane_data["cellCoords"]
        original_num_cells = lane_data["numCells"]

        # Interpolate to 2.5m spacing
        new_coords = interpolate_coordinates(
            original_coords, target_cell_size=2.5, current_cell_size=7.5
        )
        new_num_cells = len(new_coords)

        # Update lane data
        lane_data["cellCoords"] = new_coords
        lane_data["numCells"] = new_num_cells

        lanes_processed += 1

        if lanes_processed == 1:
            print(f"\nExample: {lane_id}")
            print(
                f"  Original: {original_num_cells} cells (7.5m each) = {original_num_cells * 7.5}m"
            )
            print(
                f"  New:      {new_num_cells} cells (2.5m each) = {new_num_cells * 2.5}m"
            )

    # Write new network
    print(f"\n💾 Writing new network to: {new_network_path}")
    with open(new_network_path, "w", encoding="utf-8") as f:
        json.dump(network, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Done! Processed {lanes_processed} lanes")
    print("\n⚠️  NEXT STEPS:")
    print(f"1. Review {new_network_path} to verify coordinates look correct")
    print("2. Backup your current network.json")
    print("3. Replace network.json with network_2.5m.json")
    print("4. Update engine constants (SEGMENT_SIZE, gaps, radii)")
    print("5. Test the simulation thoroughly!")


if __name__ == "__main__":
    main()
