import { defineConfig } from '@playwright/test'
export default defineConfig({testDir:'./tests',timeout:60000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1180,height:760},headless:true},webServer:{command:'npm run preview -- --port 4173',port:4173,reuseExistingServer:true}})
