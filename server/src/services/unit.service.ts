import * as unitRepository from "../repositories/unit.repository.js";

export async function getUnits() {
  return unitRepository.findAll();
}