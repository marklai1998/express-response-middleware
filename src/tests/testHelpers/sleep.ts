export const sleep = () =>
  new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
