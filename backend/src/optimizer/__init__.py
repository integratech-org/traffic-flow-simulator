"""Genetic algorithm optimizer for traffic signal timing.

This module searches for signal plans that maximize throughput and minimize wait time
and queue length. The optimizer uses a multi-generational genetic algorithm with
tournament selection, crossover, and mutation to evolve signal timing configurations.

Main entry point: POST /optimization/optimize endpoint.

The optimization process:
1. Initializes a population of random signal timing candidates
2. Evaluates each candidate by running a traffic simulation
3. Selects high-performing candidates and breeds offspring
4. Repeats for multiple generations to converge on an optimal solution

Fitness is computed as a weighted combination of normalized metrics:
  fitness = w_throughput * norm_throughput - w_wait * norm_wait - w_queue * norm_queue

Users can adjust weights to prioritize different objectives (e.g., set w_wait=2.0 to
heavily penalize wait time).
"""

__all__ = ["engine", "router", "schemas", "service"]
