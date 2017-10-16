const disputes = [
  {
    title: 'Unknown website owner',
    description: 'Party A hired Party B to do task C. Party A thinks that Party B did not satisfy the terms of the contract',
    category: 'Category',
    arbitrationFee: 1,
    deadline: '28/1/2018',
    caseId: '1',
    parties: ['Party A', 'Party B'],
    status: 'Vote',
    evidence: [{
      name: 'Contract',
      description: 'short description about evidence',
      downloadLink: ''
    }, {
      name: 'Denial',
      description: 'short description',
      downloadLink: ''
    }],
    resolutionOptions: [
      {
        name: 'Reimburse Party A',
        description: 'This option transfers funds to Party A.',
        value: '0'
      },
      {
        name: 'Pay Party B',
        description: 'This option transfers funds to Party B address.',
        value: '1'
      }
    ]
  },
  {
    title: 'Uncomplete software product',
    description: 'Giselle is an entrepreneur based on France. She contracts Miguel, a programmer from Guatemala, at a p2p freelancing platform to build a new website for her company. After they agree on a price, terms and conditions, Miguel gets to work. A couple of weeks later, he delivers the product. But Giselle is not satisfied. She argues that the quality of Miguel’s work is considerably lower than expected. Miguel replies that he did exactly what was in the agreement.',
    category: 'Web, Ecommerce',
    arbitrationFee: 0.5,
    deadline: '28/1/2018',
    caseId: '2',
    parties: ['Miguel Lorem Ipsum', 'Giselle Bexter'],
    status: 'Opportunity to appeal',
    evidence: [{
      name: 'Contract',
      description: 'short description about evidence',
      downloadLink: ''
    }, {
      name: 'Denial',
      description: 'short description',
      downloadLink: ''
    },
    {
      name: 'Various',
      description: 'short description',
      downloadLink: ''
    },
    {
      name: 'Website Drafts',
      description: 'short description',
      downloadLink: ''
    },
    {
      name: 'Website Designs',
      description: 'short description',
      downloadLink: ''
    },
    {
      name: 'Testimony',
      description: 'short description',
      downloadLink: ''
    }],
    resolutionOptions: [
      {
        name: 'Reimburse Giselle',
        description: 'This option transfers funds to Giselle.',
        value: '0'
      },
      {
        name: 'Give Miguel one extra week to finish the website',
        description: 'This option blocks new disputes for one week and removes this option from further dispute.',
        value: '1'
      },
      {
        name: 'Pay Miguel',
        description: 'This option transfers funds to Miguel address.',
        value: '2'
      }
    ]
  },
  {
    title: 'Unknown website owner',
    description: 'Party A hired Party B to do task C. Party A thinks that Party B did not satisfy the terms of the contract',
    category: 'Web, Ecommerce',
    arbitrationFee: 0.1,
    deadline: '10/9/2017',
    caseId: '3',
    parties: ['Party A', 'Party B'],
    status: 'Execution',
    evidence: [{
      name: 'Contract',
      description: 'short description about evidence',
      downloadLink: ''
    }, {
      name: 'Denial',
      description: 'short description',
      downloadLink: ''
    }],
    resolutionOptions: [
      {
        name: 'Reimburse Party A',
        description: 'This option transfers funds to Party A.',
        value: '0'
      },
      {
        name: 'Pay Party B',
        description: 'This option transfers funds to Party B address.',
        value: '1'
      }
    ]
  },
  {
    title: 'Stolen logo',
    description: 'Party A hired Party B to do task C. Party A thinks that Party B did not satisfy the terms of the contract',
    category: 'Category',
    arbitrationFee: 0.3,
    deadline: '28/1/2018',
    caseId: '4',
    parties: ['Party A', 'Party B'],
    status: 'Execution',
    evidence: [{
      name: 'Contract',
      description: 'short description about evidence',
      downloadLink: ''
    }, {
      name: 'Denial',
      description: 'short description',
      downloadLink: ''
    }],
    resolutionOptions: [
      {
        name: 'Reimburse Party A',
        description: 'This option transfers funds to Party A.',
        value: '0'
      },
      {
        name: 'Pay Party B',
        description: 'This option transfers funds to Party B address.',
        value: '1'
      }
    ]
  },
  {
    title: 'Unknown website owner',
    description: 'Party A hired Party B to do task C. Party A thinks that Party B did not satisfy the terms of the contract',
    category: 'Category',
    arbitrationFee: 0.2,
    deadline: '28/1/2018',
    caseId: '5',
    parties: ['Party A', 'Party B'],
    status: 'Vote',
    evidence: [{
      name: 'Contract',
      description: 'short description about evidence',
      downloadLink: ''
    }, {
      name: 'Denial',
      description: 'short description',
      downloadLink: ''
    }],
    resolutionOptions: [
      {
        name: 'Reimburse Party A',
        description: 'This option transfers funds to Party A.',
        value: '0'
      },
      {
        name: 'Pay Party B',
        description: 'This option transfers funds to Party B address.',
        value: '1'
      }
    ]
  },
  {
    title: 'Stolen logo',
    description: 'Party A hired Party B to do task C. Party A thinks that Party B did not satisfy the terms of the contract',
    category: 'Category',
    arbitrationFee: 0.2,
    deadline: '28/1/2018',
    caseId: '6',
    parties: ['Party A', 'Party B'],
    status: 'Vote',
    evidence: [{
      name: 'Contract',
      description: 'short description about evidence',
      downloadLink: ''
    }, {
      name: 'Denial',
      description: 'short description',
      downloadLink: ''
    }],
    resolutionOptions: [
      {
        name: 'Reimburse Party A',
        description: 'This option transfers funds to Party A.',
        value: '0'
      },
      {
        name: 'Pay Party B',
        description: 'This option transfers funds to Party B address.',
        value: '1'
      }
    ]
  },
  {
    title: 'Stolen logo',
    description: 'Party A hired Party B to do task C. Party A thinks that Party B did not satisfy the terms of the contract',
    category: 'Category',
    arbitrationFee: 2,
    deadline: '28/1/2018',
    caseId: '7',
    parties: ['Party A', 'Party B'],
    status: 'Vote',
    evidence: [{
      name: 'Contract',
      description: 'short description about evidence',
      downloadLink: ''
    }, {
      name: 'Denial',
      description: 'short description',
      downloadLink: ''
    }],
    resolutionOptions: [
      {
        name: 'Reimburse Party A',
        description: 'This option transfers funds to Party A.',
        value: '0'
      },
      {
        name: 'Pay Party B',
        description: 'This option transfers funds to Party B address.',
        value: '1'
      }
    ]
  }
]

export default disputes
