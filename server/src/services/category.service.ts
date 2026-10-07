import * as categoryRepository from "../repositories/category.repository.js";

export async function getCategories() {
    return categoryRepository.findAll();
}