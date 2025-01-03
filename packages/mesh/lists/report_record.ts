import { utils } from '@mirrormedia/lilith-core'
import { list } from '@keystone-6/core'
import { text, relationship,} from '@keystone-6/core/fields'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
    fields: {
      informant: relationship({ ref: 'Member', many: false }),
      reason: relationship({ ref: 'ReportReason', many: false }),
      respondent: relationship({ ref: 'Member', many: false }),
      comment: relationship({ ref: 'Comment', many: false }),
      collection: relationship({ ref: 'Collection', many: false }),
    },
    ui: {
      listView: {
        initialColumns: ['informant', 'respondent', 'reason', 'comment', 'collection'],
      },
    },
    access: {
      operation: {
        query: allowRoles(admin, moderator, editor),
        update: allowRoles(admin, moderator),
        create: allowRoles(admin, moderator),
        delete: allowRoles(admin),
      },
    },
  })
  
  export default utils.addTrackingFields(listConfigurations)
  