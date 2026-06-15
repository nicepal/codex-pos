const { createRepository, createCrudService, createCrudController } = require('../../shared/crud.factory');

const modules = [
  { name: 'categories', permission: 'business.categories' },
  { name: 'customers', permission: 'business.customers' },
  { name: 'suppliers', permission: 'business.suppliers' },
  { name: 'employees', permission: 'business.employees' },
  { name: 'expenses', permission: 'business.expenses' },
];

const registry = {};

for (const mod of modules) {
  const repo = createRepository(mod.name);
  const service = createCrudService(repo);
  const controller = createCrudController(service, mod.name.slice(0, -1));
  registry[mod.name] = { repo, service, controller, permission: mod.permission };
}

module.exports = registry;
