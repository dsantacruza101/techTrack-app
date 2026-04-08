import { useState } from 'react'
import { InputSwitch } from 'primereact/inputswitch'
import { Tag } from 'primereact/tag'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  category: string
  comingSoon?: boolean
}

const INTEGRATIONS: Integration[] = [
  { id: 'google_workspace', name: 'Google Workspace',    description: 'Sync assets with Google Directory and auto-assign to users.',              icon: 'pi pi-google',      category: 'Identity'  },
  { id: 'slack',            name: 'Slack',               description: 'Send work order alerts and care reminders directly to Slack channels.',     icon: 'pi pi-comments',   category: 'Messaging' },
  { id: 'email_smtp',       name: 'Email (SMTP)',         description: 'Send automated reports and alerts via your school\'s email server.',        icon: 'pi pi-envelope',   category: 'Messaging' },
  { id: 'qr_scanner',       name: 'QR / Barcode Scanner', description: 'Enable hardware scanners to look up and update assets in real time.',       icon: 'pi pi-qrcode',     category: 'Hardware'  },
  { id: 'csv_import',       name: 'CSV Import',           description: 'Bulk import assets from spreadsheets exported from other systems.',         icon: 'pi pi-file-excel', category: 'Data'      },
  { id: 'sso',              name: 'SSO / SAML',           description: 'Single sign-on with your district\'s identity provider.',                   icon: 'pi pi-lock',       category: 'Identity',  comingSoon: true },
  { id: 'api_webhooks',     name: 'API & Webhooks',       description: 'Connect TechTrack to any third-party system via REST API or webhooks.',     icon: 'pi pi-code',       category: 'Developer', comingSoon: true },
  { id: 'powerbi',          name: 'Power BI',             description: 'Stream asset and work order data into Power BI dashboards.',                icon: 'pi pi-chart-bar',  category: 'Analytics', comingSoon: true },
]

const IntegrationsPage = () => {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => setEnabled(p => ({ ...p, [id]: !p[id] }))

  const categories = [...new Set(INTEGRATIONS.map(i => i.category))]

  return (
    <div className="flex flex-column gap-6">
      <div>
        <span className="font-serif text-xl font-semibold text-900">Integrations</span>
        <p className="text-color-secondary text-sm mt-1">Connect TechTrack with your existing tools and workflows.</p>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <div className="font-mono text-xs text-500 uppercase mb-3" style={{ letterSpacing: '2px' }}>{cat}</div>
          <div className="grid">
            {INTEGRATIONS.filter(i => i.category === cat).map(integ => (
              <div key={integ.id} className="col-6">
                <div className="surface-card border-round-xl p-4 border-1 border-white-alpha-10 flex gap-4 align-items-start">
                  <div
                    className="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
                    style={{ width: 44, height: 44, background: 'var(--surface-hover)', fontSize: 20 }}
                  >
                    <i className={integ.icon} style={{ color: 'var(--tt-accent)' }} />
                  </div>
                  <div className="flex-1 min-width-0">
                    <div className="flex align-items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-900">{integ.name}</span>
                      {integ.comingSoon && <Tag value="Coming Soon" severity="secondary" rounded style={{ fontSize: 10 }} />}
                    </div>
                    <p className="text-xs text-color-secondary m-0 line-height-3">{integ.description}</p>
                  </div>
                  <InputSwitch
                    checked={!!enabled[integ.id]}
                    onChange={() => !integ.comingSoon && toggle(integ.id)}
                    disabled={!!integ.comingSoon}
                    className="flex-shrink-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default IntegrationsPage
