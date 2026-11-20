// Learnings service: the only place that knows the server addresses for this feature.
import { api } from '../../lib';

export const learningsApi = {
  categories: () => api.get('/learnCategories'),
  createCategory: (c) => api.post('/learnCategories', c),
  updateCategory: (id, patch) => api.patch(`/learnCategories/${id}`, patch),
  deleteCategory: (id) => api.del(`/learnCategories/${id}`), // also deletes its learnings
  reorderCategories: (ids) => api.post('/learnCategories/reorder', { ids }),

  all: () => api.get('/learnings'),
  create: (l) => api.post('/learnings', l),
  update: (id, patch) => api.patch(`/learnings/${id}`, patch),
  remove: (id) => api.del(`/learnings/${id}`),
  reorder: (categoryId, ids) => api.post('/learnings/reorder', { categoryId, ids }),
};
