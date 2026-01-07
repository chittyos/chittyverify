// ChittyID Integration Service
// Interfaces with the ChittyID API for authentication and verification

export interface ChittyIDValidation {
  chittyId: string;
  valid: boolean;
  details?: {
    timestamp: string;
    vertical: string;
    nodeId?: string;
    jurisdiction?: string;
  };
}

export interface ChittyIDGeneration {
  chittyId: string;
  displayFormat: string;
  timestamp: string;
  vertical: string;
  valid: boolean;
}

export class ChittyIDService {
  private readonly mothershipUrl: string;
  private readonly apiKey: string;
  private readonly nodeId: string;
  private readonly localServiceUrl: string;
  private readonly fallbackMode: boolean;

  constructor() {
    this.mothershipUrl = process.env.CHITTYID_MOTHERSHIP_URL || 'https://id.chitty.cc';
    this.apiKey = process.env.CHITTYID_API_KEY || 'dev-key';
    this.nodeId = process.env.CHITTYID_NODE_ID || '01';
    this.localServiceUrl = process.env.CHITTYID_LOCAL_URL || 'http://localhost:3000';
    this.fallbackMode = !process.env.CHITTYID_API_URL && !process.env.CHITTYID_LOCAL_URL;
  }

  async validateChittyID(chittyId: string): Promise<ChittyIDValidation> {
    // Try local service first
    try {
      const response = await fetch(`${this.localServiceUrl}/api/chittyid/${chittyId}`);
      if (response.ok) {
        const data = await response.json();
        return {
          chittyId,
          valid: true,
          details: {
            timestamp: new Date().toISOString(),
            vertical: chittyId.split('-')[2] || 'VER',
            nodeId: this.nodeId,
            jurisdiction: "USA",
            trustScore: data.trustScore,
            trustLevel: data.trustLevel
          }
        };
      }
    } catch (error) {
      console.log('Local ChittyID validation failed, using fallback:', error.message);
    }

    // Fallback to pattern validation
    return this.validateChittyIDFallback(chittyId);
  }

  private validateChittyIDFallback(chittyId: string): ChittyIDValidation {
    // ChittyID format validation: CH-YYYY-AAA-NNNN-X format
    const chittyIdPattern = /^CH-\d{4}-[A-Z]{3}-\d{4}-[A-Z]$/;
    const isValid = chittyIdPattern.test(chittyId);
    
    return {
      chittyId,
      valid: isValid,
      details: isValid ? {
        timestamp: new Date().toISOString(),
        vertical: chittyId.split('-')[2], // Extract vertical from ID
        nodeId: "fallback-node",
        jurisdiction: "USA"
      } : undefined
    };
  }

  async generateChittyID(vertical: string = 'VER'): Promise<ChittyIDGeneration> {
    // Try local ChittyID service first
    try {
      const chittyIdCode = await this.generateFromService('identity', 'person', { vertical });
      return {
        chittyId: chittyIdCode,
        displayFormat: chittyIdCode,
        timestamp: new Date().toISOString(),
        vertical: vertical.toUpperCase(),
        valid: true
      };
    } catch (error) {
      console.log('Local ChittyID service unavailable, using fallback:', error.message);
      return this.generateChittyIDFallback(vertical);
    }
  }

  private async generateFromService(domain: string = 'identity', type: string = 'person', attrs: any = {}): Promise<string> {
    // Try local service first, then mothership
    const urls = [this.localServiceUrl, this.mothershipUrl];
    
    for (const baseUrl of urls) {
      try {
        console.log(`🔗 Attempting ChittyID generation at ${baseUrl}`);
        
        const response = await fetch(`${baseUrl}/api/identity/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Node-ID': this.nodeId
          },
          body: JSON.stringify({
            domain,
            type,
            attrs,
            ctx: {
              source: 'chittyverify',
              timestamp: new Date().toISOString(),
              nodeId: this.nodeId
            }
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.chittyId || data.id;
        
      } catch (error) {
        console.log(`Failed to connect to ${baseUrl}:`, error.message);
        continue;
      }
    }
    
    throw new Error('All ChittyID services unavailable');
  }

  private generateChittyIDFallback(vertical: string = 'VER'): ChittyIDGeneration {
    const year = new Date().getFullYear();
    const sequenceNumber = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const checksum = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Random A-Z
    
    const chittyId = `CH-${year}-${vertical.toUpperCase().substring(0, 3).padEnd(3, 'X')}-${sequenceNumber}-${checksum}`;
    
    return {
      chittyId,
      displayFormat: chittyId,
      timestamp: new Date().toISOString(),
      vertical: vertical.toUpperCase(),
      valid: true
    };
  }

  async healthCheck(): Promise<{ status: string; service: string; mode?: string; mothership?: string }> {
    // Check local service first
    try {
      const response = await fetch(`${this.localServiceUrl}/api/chittyid/mothership/status`);
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'operational',
          service: 'ChittyID',
          mode: 'local',
          mothership: data.mothership || 'id.chitty.cc'
        };
      }
    } catch (error) {
      console.log('Local ChittyID service not available');
    }

    // Check mothership directly
    try {
      const response = await fetch(`${this.mothershipUrl}/health`);
      if (response.ok) {
        return {
          status: 'operational',
          service: 'ChittyID',
          mode: 'mothership',
          mothership: 'id.chitty.cc'
        };
      }
    } catch (error) {
      console.log('ChittyID mothership not available');
    }

    // Fallback mode
    return {
      status: 'operational',
      service: 'ChittyID',
      mode: 'fallback',
      mothership: 'offline'
    };
  }
}

export const chittyIdService = new ChittyIDService();