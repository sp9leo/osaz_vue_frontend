import { getDoctypeList, getResource } from '@/api/frappe'
import frappeApi from '@/api/frappe'

export const getObvestila = async (filters = []) => {
  const fields = [
    'name',
    'title',
    'zacetek',
    'content',
    'public',
    'important',
    // 'custom_velja_do',
  ]

  const result = await getDoctypeList('Obvestila', filters, fields, null, 100)
  let data = result.data || result
  if (!Array.isArray(data)) {
    data = []
  }
  return data
}

export const getImportantObvestila = async () => {
  return getObvestila([
    ['important', '=', 1]
  ])
}

export const getAllObvestila = async () => {
  const data = await getObvestila()
  console.log('getAllObvestila raw data:', data)
  return data
}

export const getObvestiloByName = async (name) => {
  const result = await getResource(`Obvestila/${name}`)
  return result.data || result
}

export const createObvestilo = async (obvestiloData) => {
  const response = await frappeApi.post('/api/resource/Obvestila', obvestiloData)
  return response.data
}

export const updateObvestilo = async (name, obvestiloData) => {
  const response = await frappeApi.put(`/api/resource/Obvestila/${name}`, obvestiloData)
  return response.data
}

export const deleteObvestilo = async (name) => {
  const response = await frappeApi.delete(`/api/resource/Obvestila/${name}`)
  return response.data
}